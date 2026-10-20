"""Attrappen für die Schnittstellen (ports), nur für Tests."""

from collections.abc import Sequence

from bot.ports.language_model import LanguageModelError, Message


class FakeLanguageModel:
    """Antwortet der Reihe nach mit `replies`; eine Exception in der Liste wird geworfen."""

    def __init__(self, replies: Sequence[str | Exception]) -> None:
        self._replies = list(replies)
        self.calls: list[list[Message]] = []

    def complete(self, messages: Sequence[Message]) -> str:
        self.calls.append(list(messages))
        reply = self._replies.pop(0)
        if isinstance(reply, Exception):
            raise reply
        return reply


def failing_model() -> FakeLanguageModel:
    """Ein Modell, das beim ersten Aufruf ausfällt."""
    return FakeLanguageModel([LanguageModelError("kaputt")])
