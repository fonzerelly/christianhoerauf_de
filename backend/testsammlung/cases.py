from dataclasses import dataclass
from pathlib import Path

import yaml

from bot.domain.intent import Intent

CASES_FILE = Path(__file__).parent / "cases.yaml"


@dataclass(frozen=True)
class Case:
    """Ein Fall der Testsammlung: Frage, erwartete Absicht und optionale Wortprüfung der Antwort.

    `group` ist `"intent"` (nur Absicht prüfen) oder `"arithmetic"` (Rechenfrage: zusätzlich die
    Antwort prüfen, das Ergebnis wird nur berichtet).
    """

    question: str
    intent: Intent
    group: str
    must_contain: tuple[str, ...]
    must_not_contain: tuple[str, ...]


def load_cases(path: Path) -> list[Case]:
    """Liest die Fälle aus einer YAML-Liste. Die Absicht steht als Wert von `Intent`;
    `christian` ist die Kurzform für `about_christian`."""
    entries = yaml.safe_load(path.read_text(encoding="utf-8"))
    return [
        Case(
            question=entry["question"],
            intent=Intent("about_christian" if entry["intent"] == "christian" else entry["intent"]),
            group=entry.get("group", "intent"),
            must_contain=tuple(entry.get("must_contain", ())),
            must_not_contain=tuple(entry.get("must_not_contain", ())),
        )
        for entry in entries
    ]
