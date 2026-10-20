"""Attrappen für die Schnittstellen (ports), nur für Tests."""

from collections.abc import Mapping, Sequence
from datetime import date

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


class FakeClock:
    """Feste Uhr: `today()` bleibt gleich, `seconds()` springt bei jedem Aufruf um `step` weiter."""

    def __init__(self, today: date = date(2026, 10, 22), step: float = 0.5) -> None:
        self._today = today
        self._step = step
        self._seconds = 100.0

    def today(self) -> date:
        return self._today

    def seconds(self) -> float:
        self._seconds += self._step
        return self._seconds


class ListLog:
    """Sammelt die Protokolleinträge in einer Liste."""

    def __init__(self) -> None:
        self.records: list[Mapping[str, object]] = []

    def write(self, record: Mapping[str, object]) -> None:
        self.records.append(record)
