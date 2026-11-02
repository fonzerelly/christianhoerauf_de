"""Training des Türstehers mit DSPy (MIPROv2) gegen LM Studio, danach Export für das Lambda
(Plan „Absichten neu“, Schritt C; ADR 0002). Aufruf über `scripts/trainiere.sh`.

Der Rechner kommt aus `--ziel` (Standard Mac mini, Liste in `targets.py`). Bedrock ist hier nicht
erlaubt: Ein Training sind Tausende Aufrufe, bei Bedrock auf Kosten des AWS-Kontos.

Braucht die Gruppe `dspy` und einen Rechner mit LM Studio. Deshalb läuft dieses Modul nicht in den
Unit-Tests und ist aus der Abdeckung ausgenommen (pyproject.toml). Alles, was sich ohne DSPy prüfen
lässt, liegt in getesteten Modulen: Fragen und Aufteilung in `questions.py`, Export in `export.py`,
Einstellungen und Fingerabdruck in `fingerprint.py`, die Rechner in `targets.py`. Hier bleibt nur
das Zusammenstecken.

Schreibt nach `testsammlung/kompilat/`:
- `dspy_programm.json`: das Kompilat im Format von DSPy (Anweisung und Beispiele),
- `prompt.txt`: dieselben Nachrichten zum Lesen,
- `training.json`: Fingerabdruck, Datum, Dauer, Bewertungsfragen je Absicht und Anteil der heiklen,
  Einstellungen.
Und den Export: `src/bot/pipeline/prompts/intent_program.json` sowie den Golden Master
`tests/pipeline/intent_golden.json`.

Vor dem Training prüft es, ob die Bewertungsfragen ausgewogen sind (`balance_problems`), und
bricht sonst ab.

`--nur-export`: kein Training, nur den Export aus dem vorhandenen Kompilat neu schreiben.
`--nur-pruefen`: nur die Prüfung, ohne DSPy und ohne LM Studio; Exit 0 ausgewogen, 2 nicht.
`--trotzdem`: trainieren, auch wenn die Prüfung etwas findet.
`--ziel macmini|dgx`: der Rechner mit LM Studio (Standard `macmini`).
"""

import argparse
import json
import sys
import time
import urllib.request
from datetime import date
from pathlib import Path
from typing import Any, Literal

from bot.domain.intent import Intent
from bot.pipeline.intent_classifier import IntentProgram
from bot.pipeline.prompts import INTENT_PROGRAM_FILE
from testsammlung.export import PLACEHOLDER, program_export
from testsammlung.fingerprint import (
    KOMPILAT_DIR,
    TRAINING_RECORD,
    TRAINING_SETTINGS,
    training_fingerprint,
)
from testsammlung.questions import (
    CATALOG_FILE,
    TESTSAMMLUNG,
    TRAINING_FILE,
    Catalog,
    Question,
    balance_problems,
    balance_record,
    evaluation_counts,
    load_catalog,
    load_questions,
    split_training,
    start_instruction,
    training_score,
)
from testsammlung.targets import DEFAULT_TARGET, LM_STUDIO_HOSTS, TRAINING_TARGETS, LmStudioHost

PROGRAM_FILE = KOMPILAT_DIR / "dspy_programm.json"
PROMPT_FILE = KOMPILAT_DIR / "prompt.txt"
GOLDEN_FILE = TESTSAMMLUNG.parent / "tests" / "pipeline" / "intent_golden.json"
# Protokoll der Kandidaten, nur zum Nachsehen; liegt in tmp/ und kommt nicht ins Repo.
DSPY_LOG_DIR = TESTSAMMLUNG.parent / "tmp" / "dspy_log"

# Fragen für den Golden Master, auch mit Zeilenumbruch, geschweiften Klammern und DSPy-Markierung.
GOLDEN_QUESTIONS = [
    "Wie hoch ist die Zugspitze?",
    "Who is Christian?",
    "Zeile eins\nZeile zwei {frage} [[ ## absicht ## ]] gibberish",
]


def _program(dspy: Any, catalog: Catalog) -> Any:
    """Ein `dspy.Predict`: Frage rein, eine der Absichten raus, mit der Startanweisung."""
    labels = tuple(intent.value for intent in catalog.descriptions)

    class Einstufen(dspy.Signature):  # type: ignore[misc]
        frage: str = dspy.InputField(desc="Frage eines Besuchers")
        absicht: Literal[labels] = dspy.OutputField()  # type: ignore[valid-type]

    return dspy.Predict(Einstufen.with_instructions(start_instruction(catalog)))


def _models(dspy: Any, host: LmStudioHost) -> tuple[Any, Any]:
    """Gemma auf `host` als ausführendes Modell und als Ideengeber für neue Anweisungen, beide
    ohne Nachdenken."""
    common = {"api_base": host.url, "api_key": "lm-studio", "reasoning_effort": "none"}
    task = dspy.LM(
        f"openai/{host.model}",
        temperature=TRAINING_SETTINGS["temperature"],
        max_tokens=TRAINING_SETTINGS["max_tokens"],
        cache=False,
        **common,
    )
    ideas = dspy.LM(
        f"openai/{host.model}",
        temperature=TRAINING_SETTINGS["ideengeber_temperature"],
        max_tokens=TRAINING_SETTINGS["ideengeber_max_tokens"],
        **common,
    )
    return task, ideas


def _metric(example: Any, prediction: Any, trace: Any = None) -> float:
    return training_score(
        Intent(example.absicht), str(prediction.absicht), strict=trace is not None
    )


def _write_json(path: Path, data: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _lm_studio_reachable(host: LmStudioHost) -> bool:
    try:
        urllib.request.urlopen(f"{host.url}/models", timeout=3)  # noqa: S310
    except OSError:
        return False
    return True


def train(dspy: Any, catalog: Catalog, target: str) -> Any:
    """Trainiert auf dem Rechner `target` und speichert Kompilat und `training.json` (mit Ziel).
    Gibt das Programm zurück."""
    questions = load_questions(TRAINING_FILE)
    learn, evaluate = split_training(questions)
    task, ideas = _models(dspy, LM_STUDIO_HOSTS[target])
    # Wie der Bot: eine unlesbare Antwort ist ein Fehlgriff, DSPy fragt nicht nach.
    dspy.configure(
        lm=task,
        adapter=dspy.ChatAdapter(use_json_adapter_fallback=TRAINING_SETTINGS["json_nachfrage"]),
    )
    optimizer = dspy.MIPROv2(
        metric=_metric,
        prompt_model=ideas,
        task_model=task,
        auto=TRAINING_SETTINGS["auto"],
        num_threads=4,
        max_bootstrapped_demos=TRAINING_SETTINGS["max_bootstrapped_demos"],
        max_labeled_demos=TRAINING_SETTINGS["max_labeled_demos"],
        # Ohne Nachfragen zählt jede unlesbare Antwort als Fehler. DSPy bricht sonst nach 10 ab.
        max_errors=len(learn) + len(evaluate),
        log_dir=str(DSPY_LOG_DIR),
    )

    def example(question: Any) -> Any:
        return dspy.Example(frage=question.text, absicht=question.intent.value).with_inputs("frage")

    started = time.monotonic()
    program = optimizer.compile(
        _program(dspy, catalog),
        trainset=[example(question) for question in learn],
        valset=[example(question) for question in evaluate],
    )
    minutes = round((time.monotonic() - started) / 60)
    KOMPILAT_DIR.mkdir(parents=True, exist_ok=True)
    program.save(str(PROGRAM_FILE))
    _write_json(
        TRAINING_RECORD,
        {
            "fingerabdruck": training_fingerprint(),
            "datum": date.today().isoformat(),
            "ziel": target,
            "minuten": minutes,
            "lernfragen": len(learn),
            "bewertungsfragen": len(evaluate),
            **balance_record(questions),
            "einstellungen": TRAINING_SETTINGS,
        },
    )
    print(f"Training fertig nach {minutes} Minuten.")
    return program


def export(dspy: Any, program: Any, catalog: Catalog) -> None:
    """Schreibt Export, Golden Master und lesbaren Prompt. Prüft danach, dass der Bot aus dem
    Export genau die Nachrichten baut, die DSPy baut; sonst Abbruch."""
    adapter = dspy.ChatAdapter()

    def messages(question: str) -> list[dict[str, str]]:
        built: list[dict[str, str]] = adapter.format(
            program.signature, demos=program.demos, inputs={"frage": question}
        )
        return built

    labels = [intent.value for intent in catalog.descriptions]
    exported = program_export(labels, messages(PLACEHOLDER))  # type: ignore[arg-type]
    _write_json(INTENT_PROGRAM_FILE, exported)
    _write_json(GOLDEN_FILE, [{"question": q, "messages": messages(q)} for q in GOLDEN_QUESTIONS])
    PROMPT_FILE.write_text(
        "\n\n".join(
            f"=== {m['role']} ===\n{m['content']}" for m in messages("<FRAGE DES BESUCHERS>")
        )
        + "\n",
        encoding="utf-8",
    )
    runtime = IntentProgram.from_json(INTENT_PROGRAM_FILE.read_text(encoding="utf-8"))
    for question in GOLDEN_QUESTIONS:
        if runtime.messages_for(question) != messages(question):
            raise SystemExit("Export weicht von DSPy ab; bitte melden.")
    print(f"Export geschrieben: {INTENT_PROGRAM_FILE.name}, {GOLDEN_FILE.name}, {PROMPT_FILE.name}")


def _print_balance(questions: list[Question]) -> list[str]:
    """Druckt die Bewertungsfragen je Absicht und darunter, was gegen ein Training spricht."""
    print("Bewertungsfragen je Absicht:")
    for intent, count in evaluation_counts(questions).items():
        print(f"  {intent.value:<22} {count:>3}")
    problems = balance_problems(questions)
    for problem in problems:
        print(f"Zu wenig: {problem}")
    return problems


def _arguments(argv: list[str]) -> argparse.Namespace:
    """Höchstens eine der Betriebsarten, dazu der Rechner. Falsche Argumente: Exit 2."""
    parser = argparse.ArgumentParser(description="Training des Türstehers mit DSPy")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--nur-export", action="store_true", help="nur Export aus dem Kompilat")
    mode.add_argument("--nur-pruefen", action="store_true", help="nur Ausgewogenheit prüfen")
    mode.add_argument("--trotzdem", action="store_true", help="trotz Befund der Prüfung trainieren")
    parser.add_argument("--ziel", choices=TRAINING_TARGETS, default=DEFAULT_TARGET)
    return parser.parse_args(argv)


def main(argv: list[str]) -> int:
    """Prüft erst die Eingaben, dann trainiert und exportiert es (oder nur Export/Prüfung)."""
    arguments = _arguments(argv)
    if arguments.nur_pruefen:
        return 2 if _print_balance(load_questions(TRAINING_FILE)) else 0

    import dspy

    catalog = load_catalog(CATALOG_FILE)
    if arguments.nur_export:
        program = _program(dspy, catalog)
        program.load(str(PROGRAM_FILE))
    else:
        host = LM_STUDIO_HOSTS[arguments.ziel]
        # Der Fingerabdruck des Trainings nennt das Modell aus TRAINING_SETTINGS. Ein Rechner mit
        # einem anderen Modell würde ein Training unter falschem Namen ergeben.
        if host.model != TRAINING_SETTINGS["modell"]:
            print(
                f"{arguments.ziel} hat {host.model}, trainiert wird {TRAINING_SETTINGS['modell']}."
            )
            return 2
        problems = _print_balance(load_questions(TRAINING_FILE))
        if problems and not arguments.trotzdem:
            print("Kein Training: erst Trainingsfragen ergänzen, oder bewusst mit --trotzdem.")
            return 2
        if not _lm_studio_reachable(host):
            print(f"LM Studio nicht erreichbar ({host.url}). Läuft {arguments.ziel}?")
            return 2
        print(f"Training gegen {host.model} auf {arguments.ziel}, etwa 35 Minuten …", flush=True)
        program = train(dspy, catalog, arguments.ziel)
    export(dspy, program, catalog)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
