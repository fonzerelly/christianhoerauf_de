"""Training des Prompts für Antworten aus der Wissensbasis mit GEPA (DSPy), beschlossen 03.11.2026
(docs/backend/antwort-prompt/KRITERIEN.md, „Training mit GEPA“). Aufruf über
`scripts/trainiere_antworten.sh`.

GEPA lässt Gemma die Lernfragen beantworten, bewertet jede Ausgabe wie die Messung
(`answer_assessment`: Regeln, Richter, Türsteher) und gibt die nicht bestandenen Kriterien als Text
an Qwen, das daraus eine bessere Anweisung schreibt. Jede neue Anweisung, die auf einer kleinen
Stichprobe besser ist, wird an allen Prüffragen gemessen; am Ende gewinnt die beste.

Gemma bekommt dabei genau die Nachrichten, die der Bot schicken soll (`BotAdapter`): System =
Anweisung + „Texte über Chris:“ + Texte + Schlusstext, dann die Frage. DSPys eigenes Format mit
Feldmarken für Ein- und Ausgabe kommt nicht vor.

Braucht die Gruppe `dspy` und LM Studio; läuft deshalb nicht in den Unit-Tests und ist aus der
Abdeckung ausgenommen (pyproject.toml). Die prüfbare Logik liegt in `answer_prompt.py` und den
Modulen der Messung.

Schreibt nach `versuche/gepa/` (von Git ignoriert): `prompt.md` (bester Prompt, direkt nutzbar mit
`scripts/messe_antworten.sh --prompt`), `verlauf.json` (Noten aller Kandidaten), `log/` (GEPA).
"""

import argparse
import json
import sys
import time
from pathlib import Path
from typing import Any

from bot.adapters.knowledge_files import knowledge_texts
from bot.pipeline.intent_classifier import IntentClassifier
from bot.pipeline.prompts import load_intent_program
from testsammlung.answer_judge import Judge
from testsammlung.answer_measurement import (
    BACKEND,
    CLOSING_FILE,
    KNOWLEDGE_DIR,
    PROMPT_FILE,
    QUESTIONS_FILE,
    build_judge,
    system_prompt,
)
from testsammlung.answer_prompt import (
    AssessmentCache,
    gepa_feedback,
    instructions_of,
    prompt_from,
)
from testsammlung.answer_questions import load_answer_questions
from testsammlung.measurement import build_gate_model
from testsammlung.targets import JUDGE_HOST, LM_STUDIO_HOSTS, TRAINING_TARGETS

OUTPUT_DIR = BACKEND / "versuche" / "gepa"
# Etwa 35 s je Bewertung (Antwort, Richter, Türsteher): 400 Bewertungen sind rund 4 Stunden.
DEFAULT_BUDGET = 400


def _bot_adapter(dspy: Any, knowledge: str, closing: str) -> Any:
    """Ein DSPy-Adapter, der die Nachrichten wie der Bot baut und die ganze Ausgabe als Feld
    `ausgabe` zurückgibt; zerlegt wird sie erst in der Bewertung."""

    class BotAdapter(dspy.Adapter):  # type: ignore[misc]
        def format(
            self, signature: Any, demos: Any, inputs: dict[str, Any]
        ) -> list[dict[str, str]]:
            prompt = prompt_from(signature.instructions)
            return [
                {"role": "system", "content": system_prompt(prompt, knowledge, closing)},
                {"role": "user", "content": inputs["frage"]},
            ]

        def parse(self, signature: Any, completion: str) -> dict[str, str]:
            return {"ausgabe": completion}

    return BotAdapter()


def _models(dspy: Any, target: str) -> tuple[Any, Any]:
    """Gemma auf dem Ziel wie im Betrieb (ohne Nachdenken, Voreinstellungen des Servers) und Qwen
    als Umschreiber (wenig Nachdenken, Temperatur 1 für neue Ideen)."""
    host = LM_STUDIO_HOSTS[target]
    student = dspy.LM(
        f"openai/{host.model}",
        api_base=host.url,
        api_key="lm-studio",
        reasoning_effort="none",
        cache=False,
        num_retries=3,
    )
    reflection = dspy.LM(
        f"openai/{JUDGE_HOST.model}",
        api_base=JUDGE_HOST.url,
        api_key="lm-studio",
        reasoning_effort="low",
        temperature=1.0,
        max_tokens=8000,
        cache=False,
        timeout=1800,
    )
    return student, reflection


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description="Training des Antwort-Prompts mit GEPA")
    parser.add_argument("--ziel", choices=TRAINING_TARGETS, default="dgx")
    parser.add_argument("--budget", type=int, default=DEFAULT_BUDGET, help="Bewertungen insgesamt")
    parser.add_argument("--prompt", type=Path, default=PROMPT_FILE)
    parser.add_argument("--schluss", type=Path, default=CLOSING_FILE)
    parser.add_argument("--fragen", type=Path, default=QUESTIONS_FILE)
    parser.add_argument("--aus", type=Path, default=OUTPUT_DIR)
    parser.add_argument(
        "--probe", action="store_true", help="nur je 2 Lern- und Prüffragen, Budget 12"
    )
    arguments = parser.parse_args(argv)

    import dspy  # erst hier: Die Gruppe dspy fehlt in den Unit-Tests.

    knowledge = knowledge_texts(KNOWLEDGE_DIR)
    closing = arguments.schluss.read_text(encoding="utf-8")
    instructions = instructions_of(arguments.prompt.read_text(encoding="utf-8"))
    student, reflection = _models(dspy, arguments.ziel)
    dspy.configure(lm=student, adapter=_bot_adapter(dspy, knowledge, closing))

    cache = AssessmentCache(
        Judge(build_judge(), knowledge),
        IntentClassifier(build_gate_model(arguments.ziel), load_intent_program()),
    )
    questions = load_answer_questions(arguments.fragen)
    by_text = {question.text: question for question in questions}
    learn = [q for q in questions if q.part == "lernen"]
    check = [q for q in questions if q.part == "pruefen"]
    budget = arguments.budget
    if arguments.probe:
        learn, check, budget = learn[:2], check[:2], 12

    def examples(selection: list[Any]) -> list[Any]:
        return [dspy.Example(frage=q.text).with_inputs("frage") for q in selection]

    def metric(
        gold: Any, pred: Any, trace: Any = None, pred_name: Any = None, pred_trace: Any = None
    ) -> Any:
        assessment = cache.assess(by_text[gold.frage], str(pred.ausgabe))
        return dspy.Prediction(score=assessment.score, feedback=gepa_feedback(assessment))

    class Antwort(dspy.Signature):  # type: ignore[misc]
        frage: str = dspy.InputField()
        ausgabe: str = dspy.OutputField()

    program = dspy.Predict(Antwort.with_instructions(instructions))
    arguments.aus.mkdir(parents=True, exist_ok=True)
    print(
        f"GEPA auf {arguments.ziel}: {len(learn)} Lernfragen, {len(check)} Prüffragen, "
        f"Budget {budget} Bewertungen",
        flush=True,
    )
    started = time.monotonic()
    optimizer = dspy.GEPA(
        metric=metric,
        max_metric_calls=budget,
        reflection_lm=reflection,
        reflection_minibatch_size=3,
        num_threads=1,  # nacheinander, sonst verliert LM Studio den Zwischenspeicher
        track_stats=True,
        log_dir=str(arguments.aus / "log"),
        seed=0,
    )
    optimized = optimizer.compile(program, trainset=examples(learn), valset=examples(check))
    minutes = round((time.monotonic() - started) / 60)

    best = optimized.signature.instructions
    (arguments.aus / "prompt.md").write_text(prompt_from(best), encoding="utf-8")
    results = optimized.detailed_results
    history = {
        "minuten": minutes,
        "bewertungen": results.total_metric_calls,
        "noten_der_kandidaten": results.val_aggregate_scores,
        "eltern": results.parents,
        "bester": results.best_idx,
        "anweisungen": [c.signature.instructions for c in results.candidates],
    }
    (arguments.aus / "verlauf.json").write_text(
        json.dumps(history, ensure_ascii=False, indent=1) + "\n", encoding="utf-8"
    )
    print(
        f"Fertig nach {minutes} min: Note der Prüffragen {results.val_aggregate_scores[0]:.2f} "
        f"(Ausgang) → {results.val_aggregate_scores[results.best_idx]:.2f} (bester von "
        f"{len(results.candidates)}). Prompt: {arguments.aus / 'prompt.md'}",
        flush=True,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
