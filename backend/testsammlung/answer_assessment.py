"""Bewertung einer Ausgabe des Modells: feste Regeln, Richter und Türsteher zusammen."""

from dataclasses import dataclass

from bot.domain.intent import Intent
from bot.pipeline.answer_fields import (
    AnswerFields,
    checked_answer_fields,
    is_fixed_text,
    read_answer_fields,
)
from bot.pipeline.intent_classifier import IntentClassifier
from bot.ports.language_model import LanguageModelError
from testsammlung.answer_judge import Judge
from testsammlung.answer_questions import AnswerQuestion
from testsammlung.answer_rules import rule_findings
from testsammlung.answer_score import Finding, feedback, score


@dataclass(frozen=True)
class Assessment:
    """Eine bewertete Ausgabe: Frage, Rohtext des Modells, was der Besucher davon sähe (`fields`,
    nach den Prüfungen im Code) und alle Befunde."""

    question: AnswerQuestion
    raw: str
    fields: AnswerFields
    findings: tuple[Finding, ...]

    @property
    def score(self) -> float:
        """Note zwischen 0 und 1 (`answer_score.score`)."""
        return score(self.findings)

    @property
    def feedback(self) -> str:
        """Die nicht bestandenen Kriterien als Text (`answer_score.feedback`)."""
        return feedback(self.findings)


def assess(
    question: AnswerQuestion, raw: str, judge: Judge | None, gate: IntentClassifier | None
) -> Assessment:
    """Prüft `raw` mit den festen Regeln, dann (ohne festen Text) mit dem Richter: die Antwort und
    jede Folgefrage, die der Besucher sähe, einmal allein (K17, K24) und einmal mit Antwort und
    Texten. Der Türsteher stuft jede dieser Folgefragen ein (K18). Ohne `judge` oder `gate` entfällt
    der jeweilige Teil. Fällt ein Modell aus, wird das ein Befund, kein Absturz."""
    findings = rule_findings(question, raw)
    fields = checked_answer_fields(read_answer_fields(raw), question.text)
    if not is_fixed_text(fields.answer):
        if judge is not None:
            findings += _judged(judge, question.text, fields)
        if gate is not None:
            findings += _gated(gate, fields.suggestions)
    return Assessment(question, raw, fields, tuple(findings))


def _judged(judge: Judge, question: str, fields: AnswerFields) -> list[Finding]:
    try:
        findings = judge.answer(question, fields)
        for suggestion in fields.suggestions:
            findings += judge.suggestion_alone(suggestion)
            findings += judge.suggestion(question, fields, suggestion)
    except LanguageModelError as error:
        return [Finding("Richter", False, False, f"Richter nicht erreichbar: {error}")]
    return findings


def _gated(gate: IntentClassifier, suggestions: tuple[str, ...]) -> list[Finding]:
    findings = []
    for suggestion in suggestions:
        try:
            intent = gate.classify(suggestion)
        except LanguageModelError as error:
            findings.append(
                Finding("K18", False, False, f"„{suggestion}“: Türsteher ausgefallen: {error}")
            )
            continue
        findings.append(
            Finding(
                "K18", False, intent is Intent.CAREER, f"„{suggestion}“: Türsteher {intent.value}"
            )
        )
    return findings
