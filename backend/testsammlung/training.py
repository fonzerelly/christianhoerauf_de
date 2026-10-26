"""Training des Türstehers mit DSPy (MIPROv2) gegen LM Studio auf dem Mac mini, danach Export
für das Lambda (Plan „Absichten neu“, Schritt C; ADR 0002). Aufruf über `scripts/trainiere.sh`.

Braucht die Gruppe `dspy` und den Mac mini. Deshalb läuft dieses Modul nicht in den Unit-Tests
und ist aus der Abdeckung ausgenommen (pyproject.toml). Alles, was sich ohne DSPy prüfen lässt,
liegt in getesteten Modulen: Fragen und Aufteilung in `questions.py`, Export in `export.py`,
Einstellungen und Fingerabdruck in `fingerprint.py`. Hier bleibt nur das Zusammenstecken.

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
`--nur-pruefen`: nur die Prüfung, ohne DSPy und ohne Mac mini; Exit 0 ausgewogen, 2 nicht.
`--trotzdem`: trainieren, auch wenn die Prüfung etwas findet.
"""

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
from testsammlung.lm_studio import LM_STUDIO_MODEL, LM_STUDIO_URL
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


def _models(dspy: Any) -> tuple[Any, Any]:
    """Gemma als ausführendes Modell und als Ideengeber für neue Anweisungen, ohne Nachdenken."""
    common = {"api_base": LM_STUDIO_URL, "api_key": "lm-studio", "reasoning_effort": "none"}
    task = dspy.LM(
        f"openai/{LM_STUDIO_MODEL}",
        temperature=TRAINING_SETTINGS["temperature"],
        max_tokens=TRAINING_SETTINGS["max_tokens"],
        cache=False,
        **common,
    )
    ideas = dspy.LM(
        f"openai/{LM_STUDIO_MODEL}",
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


def _lm_studio_reachable() -> bool:
    try:
        urllib.request.urlopen(f"{LM_STUDIO_URL}/models", timeout=3)  # noqa: S310
    except OSError:
        return False
    return True


def train(dspy: Any, catalog: Catalog) -> Any:
    """Trainiert und speichert Kompilat und `training.json`. Gibt das Programm zurück."""
    questions = load_questions(TRAINING_FILE)
    learn, evaluate = split_training(questions)
    task, ideas = _models(dspy)
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


USAGE = "Aufruf: python -m testsammlung.training [--nur-export | --nur-pruefen | --trotzdem]"


def _print_balance(questions: list[Question]) -> list[str]:
    """Druckt die Bewertungsfragen je Absicht und darunter, was gegen ein Training spricht."""
    print("Bewertungsfragen je Absicht:")
    for intent, count in evaluation_counts(questions).items():
        print(f"  {intent.value:<22} {count:>3}")
    problems = balance_problems(questions)
    for problem in problems:
        print(f"Zu wenig: {problem}")
    return problems


def main(argv: list[str]) -> int:
    """Prüft erst die Eingaben, dann trainiert und exportiert es (oder nur Export/Prüfung)."""
    if argv not in ([], ["--nur-export"], ["--nur-pruefen"], ["--trotzdem"]):
        print(USAGE)
        return 2
    if argv == ["--nur-pruefen"]:
        return 2 if _print_balance(load_questions(TRAINING_FILE)) else 0

    import dspy

    catalog = load_catalog(CATALOG_FILE)
    if argv == ["--nur-export"]:
        program = _program(dspy, catalog)
        program.load(str(PROGRAM_FILE))
    else:
        problems = _print_balance(load_questions(TRAINING_FILE))
        if problems and argv != ["--trotzdem"]:
            print("Kein Training: erst Trainingsfragen ergänzen, oder bewusst mit --trotzdem.")
            return 2
        if not _lm_studio_reachable():
            print(f"LM Studio nicht erreichbar ({LM_STUDIO_URL}). Läuft der Mac mini?")
            return 2
        print(f"Training gegen {LM_STUDIO_MODEL}, etwa 35 Minuten …", flush=True)
        program = train(dspy, catalog)
    export(dspy, program, catalog)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
