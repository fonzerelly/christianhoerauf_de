"""Nachfragen mit dem Gesprächsverlauf eigenständig machen (ADR 0005).

„Wie lange war das?“ versteht weder der Türsteher noch der Zwischenspeicher. Mit der letzten Frage
und Antwort des Gesprächs schreibt ein kurzer Modellaufruf daraus eine Frage, die allein steht
(„Wie lange studierte Chris in Ilmenau?“). Danach läuft alles wie ohne Verlauf.
"""

import json
from dataclasses import dataclass

from bot.ports.language_model import LanguageModel, LanguageModelError

# So lang darf auch eine Frage des Besuchers sein (handler.MAX_QUESTION_LENGTH).
MAX_REWRITTEN_LENGTH = 500
REWRITER_TEMPERATURE = 0.0
REWRITER_MAX_TOKENS = 150


@dataclass(frozen=True)
class Exchange:
    """Die letzte Frage eines Gesprächs (schon eigenständig) und die Antwort des Bots darauf."""

    question: str
    answer: str

    def to_json(self) -> str:
        """So steht der Austausch im Speicher."""
        return json.dumps({"question": self.question, "answer": self.answer}, ensure_ascii=False)

    @classmethod
    def from_json(cls, text: str) -> Exchange:
        """Liest, was `to_json` geschrieben hat."""
        data = json.loads(text)
        return cls(str(data["question"]), str(data["answer"]))


class QuestionRewriter:
    """Schreibt eine Frage mit dem letzten Austausch des Gesprächs eigenständig um."""

    def __init__(self, model: LanguageModel, system_prompt: str) -> None:
        self._model = model
        self._system_prompt = system_prompt

    def rewrite(self, question: str, before: Exchange) -> str:
        """Die erste Zeile der Antwort des Modells. Bleibt nichts übrig, ist sie länger als eine
        erlaubte Frage oder fällt das Modell aus, bleibt die Frage, wie sie ist: Ohne Verlauf
        beantwortet der Bot sie wie bisher."""
        context = (
            f"Vorige Frage: {before.question}\n"
            f"Antwort des Chatbots: {before.answer}\n"
            f"Neue Frage: {question}"
        )
        try:
            reply = self._model.complete(
                [
                    {"role": "system", "content": self._system_prompt},
                    {"role": "user", "content": context},
                ]
            )
        except LanguageModelError:
            return question
        lines = [line.strip() for line in reply.splitlines() if line.strip()]
        if not lines or len(lines[0]) > MAX_REWRITTEN_LENGTH:
            return question
        return lines[0]
