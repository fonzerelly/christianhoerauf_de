"""Fragen für Messung und Training der Antworten aus der Wissensbasis.

Eine YAML-Liste von Einträgen `{frage, sprache, art, teil}`. Fragen zur echten Wissensbasis liegen
verschlüsselt in docs/backend/antwort-prompt/ (git-crypt), nie in den Tests.
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


@dataclass(frozen=True)
class AnswerQuestion:
    """Eine Frage samt Sprache, Art und Teil der Sammlung (Bedeutungen oben)."""

    text: str
    language: str = "de"
    kind: str = "normal"
    part: str = "lernen"


def load_answer_questions(path: Path) -> list[AnswerQuestion]:
    """Liest die YAML-Liste. Fehlt `sprache`, `art` oder `teil`, gilt de, normal, lernen.
    Ein unbekannter Wert: `ValueError` mit der Frage."""
    questions = []
    for entry in yaml.safe_load(path.read_text(encoding="utf-8")):
        question = AnswerQuestion(
            str(entry["frage"]),
            entry.get("sprache", "de"),
            entry.get("art", "normal"),
            entry.get("teil", "lernen"),
        )
        if (
            question.language not in LANGUAGES
            or question.kind not in KINDS
            or question.part not in PARTS
        ):
            raise ValueError(f"Unbekannte Sprache, Art oder Teil bei: {question.text}")
        questions.append(question)
    return questions
