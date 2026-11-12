"""Die Szenarien des Integrationstests „Besucherpfade“ (docs/backend/INTEGRATIONSTEST.md).

Eine YAML-Liste von Personas `{persona, beschreibung, fragen}`; jede Frage `{frage, erwartet}`.
Die echten Szenarien liegen verschlüsselt in docs/backend/antwort-prompt/besucherpfade.yaml
(git-crypt), weil sie Fragen über Chris enthalten.
"""

from dataclasses import dataclass
from pathlib import Path

import yaml

# wissensbasis: Antwort über Chris mit Folgefragen. allgemein: Antwort des Modells ohne
# Wissensbasis. fest: fester Text oder Gimmick. angriff: der Bot darf der Anweisung nicht folgen.
EXPECTATIONS = ("wissensbasis", "allgemein", "fest", "angriff")
FIELDS = ("frage", "erwartet")


@dataclass(frozen=True)
class StartQuestion:
    """Eine Einstiegsfrage und was der Bot darauf tun soll (`EXPECTATIONS`)."""

    text: str
    expected: str


@dataclass(frozen=True)
class Persona:
    """Wer die Seite besucht, kurz beschrieben, und womit er anfängt."""

    name: str
    description: str
    questions: tuple[StartQuestion, ...]


def load_personas(path: Path) -> list[Persona]:
    """Liest die YAML-Liste. Ein unbekanntes oder fehlendes Feld einer Frage oder eine unbekannte
    Erwartung: `ValueError` mit der Frage, damit kein Tippfehler still eine Frage verändert."""
    personas = []
    for entry in yaml.safe_load(path.read_text(encoding="utf-8")):
        questions = tuple(_question(question) for question in entry["fragen"])
        personas.append(Persona(entry["persona"], entry["beschreibung"], questions))
    return personas


def _question(entry: dict[str, object]) -> StartQuestion:
    text = str(entry["frage"])
    if set(entry) != set(FIELDS) or entry["erwartet"] not in EXPECTATIONS:
        raise ValueError(
            f"Felder müssen {', '.join(FIELDS)} sein, erwartet eins von "
            f"{', '.join(EXPECTATIONS)}; bei: {text}"
        )
    return StartQuestion(text, str(entry["erwartet"]))
