"""Christians Sollwerte für das Stichwort und die Bewertung eines Stichworts daran.

Die Sollwerte stehen in docs/backend/antwort-prompt/sollwerte_stichwort.yaml: je Messfrage eine
Liste guter Überschriften (die erste ist die liebste), `keins` (feste Antwort, kein Stichwort)
oder `frei` (das Thema hängt von der gewählten Geschichte ab, zählt nicht).
"""

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Protocol

import yaml

from bot.pipeline.answer_fields import keyword_problem

# Eine Liste guter Überschriften oder eines der Wörter „keins“ und „frei“.
Expected = tuple[str, ...] | str


@dataclass(frozen=True)
class Rating:
    """Note von 0 bis 1 (`None` bei `frei`) und ihr Grund."""

    score: float | None
    reason: str


class Comparer(Protocol):
    """Vergleicht zwei Stichwörter, etwa `testsammlung.kev.Kev`."""

    def prefers(self, question: str, answer: str, mine: str, reference: str) -> float: ...


def load_reference_keywords(path: Path) -> dict[str, Expected]:
    """Liest die Sollwerte je Frage. Ein Sollwert, den der Bot selbst verwerfen würde (K12), ist
    ein Fehler in der Datei: `ValueError` mit dem Sollwert."""
    references: dict[str, Expected] = {}
    for entry in yaml.safe_load(path.read_text(encoding="utf-8")):
        expected = entry["soll"]
        if isinstance(expected, list):
            for heading in expected:
                problem = keyword_problem(heading)
                if problem:
                    raise ValueError(f"Sollwert „{heading}“ ({entry['frage']}): {problem}")
            expected = tuple(expected)
        references[entry["frage"]] = expected
    return references


def _normalized(text: str) -> str:
    """Groß/klein, Leerzeichen und Bindestriche spielen beim Vergleich keine Rolle."""
    return re.sub(r"[\s\-]", "", text).lower()


def rate_keyword(
    question: str, answer: str, keyword: str | None, expected: Expected, kev: Comparer
) -> Rating:
    """Bewertet das Stichwort, das der Bot nach seinen Prüfungen zeigen würde (`None`: keins).

    Trifft es einen Sollwert: 1. Sonst fragt es Kev, ob es besser ist als der erste Sollwert;
    die Note ist Kevs Wahrscheinlichkeit dafür, ab 0,5 also „gleich gut“. Kein Stichwort, obwohl
    eins erwartet wird: 0. Bei `keins` umgekehrt."""
    if expected == "frei":
        return Rating(None, "frei")
    if expected == "keins":
        if keyword is None:
            return Rating(1.0, "keins")
        return Rating(0.0, "Stichwort trotz fester Antwort")
    if keyword is None:
        return Rating(0.0, "kein gültiges Stichwort")
    if _normalized(keyword) in {_normalized(heading) for heading in expected}:
        return Rating(1.0, "Treffer")
    probability = kev.prefers(question, answer, keyword, expected[0])
    return Rating(round(probability, 3), f"Kev {probability:.2f} gegen „{expected[0]}“")
