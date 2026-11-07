"""Fragen für Messung und Training der Antworten aus der Wissensbasis.

Eine YAML-Liste von Einträgen `{frage, sprache, art, teil, erwartet, verboten}`; nur `frage` ist
Pflicht. Fragen zur echten Wissensbasis liegen verschlüsselt in docs/backend/antwort-prompt/
(git-crypt), nie in den Tests.
"""

from dataclasses import dataclass
from pathlib import Path

import yaml

LANGUAGES = ("de", "en")
# normal: die Texte beantworten die Frage. fehlt: sie tun es nicht („Darüber lerne ich gerade
# noch.“). urteil: Frage nach einem Urteil über Chris. verboten: Straftat, Waffen und Ähnliches.
# umgehung: Versuch, Regeln oder Texte zu entlocken. anekdote: Erlebnis mit überraschendem Ende.
KINDS = ("normal", "fehlt", "urteil", "verboten", "umgehung", "anekdote")
# lernen: das Training lernt daran. pruefen: das Training prüft sich daran, die Messung auch.
PARTS = ("lernen", "pruefen")
# erwartet: Liste von Gruppen, aus jeder muss eine Alternative in der Antwort stehen (K5).
# verboten: Wörter, die nicht in der Antwort stehen dürfen, etwa eine Pointe (K10).
FIELDS = ("frage", "sprache", "art", "teil", "erwartet", "verboten")


@dataclass(frozen=True)
class AnswerQuestion:
    """Eine Frage samt Sprache, Art, Teil der Sammlung, erwarteten und verbotenen Wörtern
    (Bedeutungen oben)."""

    text: str
    language: str = "de"
    kind: str = "normal"
    part: str = "lernen"
    expected: tuple[tuple[str, ...], ...] = ()
    forbidden: tuple[str, ...] = ()


def load_answer_questions(path: Path) -> list[AnswerQuestion]:
    """Liest die YAML-Liste. Fehlt `sprache`, `art` oder `teil`, gilt de, normal, lernen.
    Ein unbekanntes Feld oder ein unbekannter Wert: `ValueError` mit der Frage. So bleibt kein
    Feld unbemerkt liegen (bis 07.11.2026 wurden `erwartet` und `verboten` übergangen)."""
    questions = []
    for entry in yaml.safe_load(path.read_text(encoding="utf-8")):
        unknown = sorted(set(entry) - set(FIELDS))
        if unknown:
            raise ValueError(f"Unbekanntes Feld {', '.join(unknown)} bei: {entry['frage']}")
        question = AnswerQuestion(
            str(entry["frage"]),
            entry.get("sprache", "de"),
            entry.get("art", "normal"),
            entry.get("teil", "lernen"),
            tuple(tuple(str(word) for word in group) for group in entry.get("erwartet", [])),
            tuple(str(word) for word in entry.get("verboten", [])),
        )
        if (
            question.language not in LANGUAGES
            or question.kind not in KINDS
            or question.part not in PARTS
        ):
            raise ValueError(f"Unbekannte Sprache, Art oder Teil bei: {question.text}")
        questions.append(question)
    return questions
