from typing import Protocol

from bot.domain.answer import Answer
from bot.domain.intent import Intent


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


# Das Frontend zeichnet zu diesen Absichten ein Bild statt des Textes bzw. legt das Foto von
# Chris auf die Seite (ADR 0003, Nachträge 2026-10-27 und 2026-10-28).
_GIMMICKS: dict[Intent, dict[str, object]] = {
    Intent.FLIRT: {"type": "heart"},
    Intent.PICTURE: {"type": "photo"},
    Intent.SEXUAL: {"type": "face_with_hand_over_mouth"},
}


def gimmick_for(intent: Intent) -> dict[str, object] | None:
    """Das `gimmick`-Objekt der Antwort auf diese Absicht, oder `None`, wenn es keins gibt. Jeder
    Aufruf liefert eine eigene Kopie."""
    gimmick = _GIMMICKS.get(intent)
    return None if gimmick is None else dict(gimmick)
