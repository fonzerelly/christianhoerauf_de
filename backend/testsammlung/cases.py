import re
from dataclasses import dataclass
from pathlib import Path

import yaml

from bot.domain.intent import Intent

CASES_FILE = Path(__file__).parent / "cases.yaml"


@dataclass(frozen=True)
class Case:
    """Ein Fall der Testsammlung: Frage, erlaubte Absichten und optionale Wortprüfung der Antwort.

    `intents` sind alle Absichten, die als richtig gelten; die erste ist die Hauptabsicht.
    `group` ist `"intent"` (nur Absicht prüfen) oder `"arithmetic"` (Rechenfrage: zusätzlich die
    Antwort prüfen, das Ergebnis wird nur berichtet).
    """

    question: str
    intents: tuple[Intent, ...]
    group: str
    must_contain: tuple[str, ...]
    must_not_contain: tuple[str, ...]

    @property
    def intent(self) -> Intent:
        """Die Hauptabsicht; nach ihr wird die Trefferquote gezählt."""
        return self.intents[0]


def load_cases(path: Path) -> list[Case]:
    """Liest die Fälle aus einer YAML-Liste. `intent` ist ein Kürzel wie `general/knowledge` oder
    mehrere, als Liste oder durch Leerzeichen/Komma getrennt."""
    entries = yaml.safe_load(path.read_text(encoding="utf-8"))
    return [
        Case(
            question=entry["question"],
            intents=tuple(Intent(label) for label in _labels(entry["intent"])),
            group=entry.get("group", "intent"),
            must_contain=tuple(entry.get("must_contain", ())),
            must_not_contain=tuple(entry.get("must_not_contain", ())),
        )
        for entry in entries
    ]


def _labels(intent: str | list[str]) -> list[str]:
    if isinstance(intent, list):
        return intent
    return re.split(r"[\s,]+", intent.strip())
