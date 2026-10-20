from enum import Enum


class Intent(Enum):
    """Wozu eine Frage gestellt wird (siehe CONTEXT.md: Absicht)."""

    GENERAL = "general"
    ABOUT_CHRISTIAN = "about_christian"
    GIMMICK = "gimmick"
    DISALLOWED = "disallowed"
