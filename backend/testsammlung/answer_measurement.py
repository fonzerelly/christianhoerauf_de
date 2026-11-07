"""Messung der Antworten aus der Wissensbasis mit Stichwort und Folgefragen.

Aufruf über `scripts/messe_antworten.sh [--ziel …] [--prompt DATEI] [--teil …] [--runden N]`.
Gemma antwortet auf dem Ziel (`targets.py`, auch Bedrock), der Türsteher läuft auf demselben Ziel,
der Richter immer als Qwen auf der DGX (`JUDGE_HOST`). Kriterien und Bewertung:
docs/backend/antwort-prompt/KRITERIEN.md.

Erst werden alle Fragen beantwortet, dann alle bewertet: So bleibt der lange Systemprompt von
Gemma und danach der von Qwen im Zwischenspeicher von LM Studio.
"""

import argparse
import json
import sys
from collections import Counter
from collections.abc import Callable, Sequence
from pathlib import Path

from bot.adapters.knowledge_files import knowledge_texts
from bot.pipeline.intent_classifier import IntentClassifier
from bot.pipeline.prompts import knowledge_base_system_prompt, load_intent_program
from bot.ports.language_model import LanguageModel, LanguageModelError
from testsammlung.answer_assessment import Assessment, assess
from testsammlung.answer_judge import Judge
from testsammlung.answer_questions import PARTS, AnswerQuestion, load_answer_questions
from testsammlung.measurement import build_gate_model
from testsammlung.targets import (
    DEFAULT_TARGET,
    MEASUREMENT_TARGETS,
    build_judge_model,
    build_target_model,
)

BACKEND = Path(__file__).resolve().parent.parent
PROMPTS = BACKEND / "src" / "bot" / "pipeline" / "prompts"
PROMPT_FILE = PROMPTS / "knowledge_base_answer_fields.md"
CLOSING_FILE = PROMPTS / "knowledge_base_answer_fields_end.md"
KNOWLEDGE_DIR = BACKEND / "wissensbasis"
# Zielt auf die echte Wissensbasis, deshalb verschlüsselt unter docs/ (git-crypt).
QUESTIONS_FILE = BACKEND.parent / "docs" / "backend" / "antwort-prompt" / "fragen_antworten.yaml"
JUDGE_MAX_TOKENS = 600


def system_prompt(prompt: str, knowledge: str, closing: str) -> str:
    """Der Systemprompt genau wie im Bot (`knowledge_base_system_prompt`)."""
    return knowledge_base_system_prompt(prompt, knowledge, closing)


def measure_answers(
    questions: Sequence[AnswerQuestion],
    model: LanguageModel,
    system: str,
    judge: Judge | None,
    gate: IntentClassifier | None,
    rounds: int,
) -> list[Assessment]:
    """Stellt jede Frage `rounds`-mal, dann bewertet es jede Ausgabe (`assess`). Fällt Gemma aus,
    wird „FEHLER: …“ bewertet, die Messung läuft weiter."""
    raws = []
    for _ in range(rounds):
        for question in questions:
            try:
                raw = model.complete(
                    [
                        {"role": "system", "content": system},
                        {"role": "user", "content": question.text},
                    ]
                )
            except LanguageModelError as error:
                raw = f"FEHLER: {error}"
            raws.append((question, raw))
    return [assess(question, raw, judge, gate) for question, raw in raws]


def summary(assessments: Sequence[Assessment], part: str, rounds: int) -> str:
    """Bericht zum Lesen: mittlere Note, Anteil mit verletztem muss, K32, Folgefragen je Antwort,
    und wie oft jedes Kriterium durchfiel."""
    count = len(assessments)
    mean = sum(a.score for a in assessments) / count if count else 0.0
    must_failed = sum(1 for a in assessments if any(f.must and not f.passed for f in a.findings))
    complete = [f for a in assessments for f in a.findings if f.criterion == "K32"]
    suggestions = sum(len(a.fields.suggestions) for a in assessments) / count if count else 0.0
    failed = Counter((f.criterion, f.must) for a in assessments for f in a.findings if not f.passed)
    lines = [
        f"Antworten: {count} (Teil {part}, {rounds} Runde{'n' if rounds != 1 else ''})",
        f"Mittlere Note: {mean:.2f}",
        f"Mit verletztem muss-Kriterium: {must_failed} von {count}",
        f"Stichwort und Folgefrage vorhanden (K32): "
        f"{sum(f.passed for f in complete)} von {len(complete)} geprüften",
        f"Folgefragen je Antwort: {suggestions:.1f}",
        "Nicht bestanden, je Kriterium:",
    ]
    lines += [
        f"  {criterion} ({'muss' if must else 'soll'})  {n}"
        for (criterion, must), n in failed.most_common()
    ]
    return "\n".join(lines)


def record(assessments: Sequence[Assessment]) -> list[dict[str, object]]:
    """Alle Einzelheiten für die JSON-Datei: Frage, Rohtext, was der Besucher sähe, Note und
    Befunde."""
    return [
        {
            "frage": a.question.text,
            "sprache": a.question.language,
            "art": a.question.kind,
            "teil": a.question.part,
            "roh": a.raw,
            "antwort": a.fields.answer,
            "stichwort": a.fields.keyword,
            "folgefragen": list(a.fields.suggestions),
            "note": a.score,
            "befunde": [
                {"kriterium": f.criterion, "muss": f.must, "bestanden": f.passed, "notiz": f.note}
                for f in a.findings
            ],
        }
        for a in assessments
    ]


def build_answer_model(target: str) -> LanguageModel:
    """Gemma auf dem Ziel wie der Bot für Antworten: Voreinstellungen des Servers, Zeitlimit
    300 s."""
    return build_target_model(target, timeout_seconds=300)


def build_judge() -> LanguageModel:
    """Qwen auf der DGX als Richter."""
    return build_judge_model(timeout_seconds=600, max_tokens=JUDGE_MAX_TOKENS)


def main(
    argv: Sequence[str] = (),
    answer_model_factory: Callable[[str], LanguageModel] = build_answer_model,
    judge_model_factory: Callable[[], LanguageModel] = build_judge,
    gate_model_factory: Callable[[str], LanguageModel] = build_gate_model,
) -> int:
    """Liest die Optionen, misst, druckt den Bericht und schreibt die Einzelheiten nach `--aus`."""
    parser = argparse.ArgumentParser(description="Messung der Antworten aus der Wissensbasis")
    parser.add_argument("--ziel", choices=MEASUREMENT_TARGETS, default=DEFAULT_TARGET)
    parser.add_argument("--prompt", type=Path, default=PROMPT_FILE)
    parser.add_argument("--schluss", type=Path, default=CLOSING_FILE)
    parser.add_argument("--fragen", type=Path, default=QUESTIONS_FILE)
    parser.add_argument("--teil", choices=(*PARTS, "alle"), default="pruefen")
    parser.add_argument("--runden", type=int, default=1)
    parser.add_argument("--wissensbasis", type=Path, default=KNOWLEDGE_DIR)
    parser.add_argument("--aus", type=Path, default=None)
    arguments = parser.parse_args(argv)

    questions = [
        question
        for question in load_answer_questions(arguments.fragen)
        if arguments.teil in ("alle", question.part)
    ]
    knowledge = knowledge_texts(arguments.wissensbasis)
    system = system_prompt(
        arguments.prompt.read_text(encoding="utf-8"),
        knowledge,
        arguments.schluss.read_text(encoding="utf-8"),
    )
    print(f"Messe {len(questions)} Fragen auf {arguments.ziel} …", flush=True)
    assessments = measure_answers(
        questions,
        answer_model_factory(arguments.ziel),
        system,
        Judge(judge_model_factory(), knowledge),
        IntentClassifier(gate_model_factory(arguments.ziel), load_intent_program()),
        arguments.runden,
    )
    print(summary(assessments, arguments.teil, arguments.runden))
    report = arguments.aus or BACKEND / "versuche" / f"antworten.{arguments.ziel}.json"
    report.parent.mkdir(parents=True, exist_ok=True)
    report.write_text(json.dumps(record(assessments), ensure_ascii=False, indent=1) + "\n", "utf-8")
    print(f"Gespeichert: {report}")
    return 0


if __name__ == "__main__":  # pragma: no cover - Einstieg, wird per Skript gestartet
    sys.exit(main(sys.argv[1:]))
