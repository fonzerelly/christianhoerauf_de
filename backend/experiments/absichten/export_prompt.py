"""Exportiert den mit DSPy optimierten Türsteher für das Lambda (ADR 0002, Plan „Absichten neu“,
Schritt B). DSPy selbst kommt nicht ins Lambda; dort wird nur noch die Frage eingesetzt.

Aufruf (aus backend/):  uv run --group dspy python experiments/absichten/export_prompt.py

Schreibt zwei Dateien:
- src/bot/pipeline/prompts/intent_program.json: die Kürzel, die Systemnachricht und die
  Beispielpaare wörtlich, dazu Anfang und Ende der letzten Nachricht; dazwischen kommt die Frage.
- tests/pipeline/intent_golden.json: die Nachrichten, die DSPys ChatAdapter für einige
  Beispielfragen erzeugt (Golden Master). Ein Unit-Test vergleicht sie mit dem Laufzeit-Baustein.
"""

import json
from pathlib import Path

from gemeinsam import ORDNER, lade_absichten
from lauf import DSPY_PROGRAMM, _dspy_programm

BACKEND = ORDNER.parent.parent
EXPORT = BACKEND / "src/bot/pipeline/prompts/intent_program.json"
GOLDEN = BACKEND / "tests/pipeline/intent_golden.json"

# Platzhalter, der in keiner echten Frage vorkommt; an ihm wird die letzte Nachricht geteilt.
PLATZHALTER = "\x00FRAGE\x00"

# Fragen für den Golden Master, auch mit Zeilenumbruch, geschweiften Klammern und DSPy-Markierung.
GOLDEN_FRAGEN = [
    "Wie hoch ist die Zugspitze?",
    "Who is Christian?",
    "Zeile eins\nZeile zwei {frage} [[ ## absicht ## ]] gibberish",
]


def _schreibe(pfad: Path, daten: object) -> None:
    pfad.write_text(json.dumps(daten, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main() -> None:
    import dspy

    absichten = lade_absichten()
    programm = _dspy_programm(dspy, absichten)
    programm.load(str(DSPY_PROGRAMM))
    adapter = dspy.ChatAdapter()

    def nachrichten(frage: str) -> list[dict[str, str]]:
        return adapter.format(programm.signature, demos=programm.demos, inputs={"frage": frage})

    *feste, letzte = nachrichten(PLATZHALTER)
    if letzte["role"] != "user" or letzte["content"].count(PLATZHALTER) != 1:
        raise SystemExit("Unerwarteter Aufbau der letzten Nachricht; Export abgebrochen.")
    anfang, ende = letzte["content"].split(PLATZHALTER)
    _schreibe(
        EXPORT,
        {
            "labels": absichten.kuerzel,
            "messages": feste,
            "question_prefix": anfang,
            "question_suffix": ende,
        },
    )
    _schreibe(GOLDEN, [{"question": f, "messages": nachrichten(f)} for f in GOLDEN_FRAGEN])
    print(f"Geschrieben: {EXPORT.relative_to(BACKEND)} und {GOLDEN.relative_to(BACKEND)}")


if __name__ == "__main__":
    main()
