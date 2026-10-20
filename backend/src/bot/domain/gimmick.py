from typing import Protocol

from bot.domain.answer import Answer


class Gimmick(Protocol):
    """Eine Antwort mit eigener Darstellung (CONTEXT.md: Gimmick). Ab Stufe 3 mit Leben gefüllt."""

    name: str
    description: str  # beschreibt die Absicht, aus der die Auswahl der Absichten entsteht

    def answer(self, question: str) -> Answer: ...


class GimmickRegistry:
    """Anmeldung der Gimmicks. In Stufe 1 bleibt sie leer."""

    def __init__(self) -> None:
        self._gimmicks: list[Gimmick] = []

    @property
    def gimmicks(self) -> tuple[Gimmick, ...]:
        return tuple(self._gimmicks)

    def register(self, gimmick: Gimmick) -> None:
        self._gimmicks.append(gimmick)

    def descriptions(self) -> list[str]:
        return [gimmick.description for gimmick in self._gimmicks]
