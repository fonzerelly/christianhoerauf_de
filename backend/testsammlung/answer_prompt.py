"""Was das Training der Antworten (GEPA) ohne DSPy braucht: Prompt zerlegen und zusammensetzen,
Bewertungen zwischenspeichern, Rückmeldung für GEPA.

GEPA verändert nur die Anweisung, also den Prompt ohne die Überschrift „Texte über Chris:“, unter
der der Bot die Texte anhängt. So kann GEPA die Überschrift nicht verlieren.
"""

from bot.pipeline.intent_classifier import IntentClassifier
from testsammlung.answer_assessment import Assessment, assess
from testsammlung.answer_judge import Judge
from testsammlung.answer_questions import AnswerQuestion

KNOWLEDGE_HEADING = "Texte über Chris:"
# Hängt an jeder Rückmeldung; GEPA soll die Anweisung allgemein halten (KRITERIEN.md, „Training
# mit GEPA“), sonst veraltet sie, sobald neue Texte dazukommen.
GEPA_REMINDER = (
    "Beim Verbessern der Anweisung: Schreib sie weiter auf Deutsch und behalte das Format mit den "
    "drei Feldmarken. Nenne keine Fakten aus den Texten (Firmen, Jahre, Projekte, Erlebnisse), "
    "denn die Texte stehen ohnehin im Prompt und ändern sich; formuliere allgemeine Regeln, die "
    "für jeden Text gelten."
)


def instructions_of(prompt: str) -> str:
    """Der Prompt ohne die Überschrift „Texte über Chris:“ am Ende; fehlt sie: `ValueError`."""
    stripped = prompt.rstrip()
    if not stripped.endswith(KNOWLEDGE_HEADING):
        raise ValueError(f"Der Prompt endet nicht mit „{KNOWLEDGE_HEADING}“")
    return stripped.removesuffix(KNOWLEDGE_HEADING).rstrip()


def prompt_from(instructions: str) -> str:
    """Prompt aus einer Anweisung: Anweisung, Leerzeile, Überschrift, Leerzeile – wie
    `knowledge_base_answer_fields.md`, damit der Bot die Texte direkt anhängen kann."""
    return f"{instructions.rstrip()}\n\n{KNOWLEDGE_HEADING}\n\n"


class AssessmentCache:
    """Bewertet jede Kombination aus Frage und Ausgabe nur einmal. GEPA ruft die Bewertung je
    Ausgabe zweimal auf (Note, dann Rückmeldung); der Richter braucht dafür jeweils Sekunden."""

    def __init__(self, judge: Judge | None, gate: IntentClassifier | None) -> None:
        self._judge = judge
        self._gate = gate
        self._done: dict[tuple[str, str], Assessment] = {}

    def assess(self, question: AnswerQuestion, raw: str) -> Assessment:
        """Wie `answer_assessment.assess`, beim zweiten Mal aus dem Speicher."""
        key = (question.text, raw)
        if key not in self._done:
            self._done[key] = assess(question, raw, self._judge, self._gate)
        return self._done[key]


def gepa_feedback(assessment: Assessment) -> str:
    """Die Rückmeldung für GEPA: die nicht bestandenen Kriterien, dann `GEPA_REMINDER`."""
    return f"{assessment.feedback}\n\n{GEPA_REMINDER}"
