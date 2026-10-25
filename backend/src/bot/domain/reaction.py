from enum import Enum

from bot.domain.intent import Intent


class ReactionKind(Enum):
    """Was der Bot auf eine Absicht tut (docs/backend/ABSICHTEN.md, „Reaktionsarten“)."""

    GENERAL_ANSWER = "general_answer"
    TASK_ANSWER = "task_answer"
    FIXED_TEXT = "fixed_text"
    GIMMICK = "gimmick"


_SPECIAL_REACTIONS = {
    Intent.KNOWLEDGE: ReactionKind.GENERAL_ANSWER,
    Intent.SMALLTALK: ReactionKind.GENERAL_ANSWER,
    Intent.TASK: ReactionKind.TASK_ANSWER,
    Intent.FLIRT: ReactionKind.GIMMICK,
    Intent.PICTURE: ReactionKind.GIMMICK,
    Intent.SEXUAL: ReactionKind.GIMMICK,
}


def reaction_for(intent: Intent) -> ReactionKind:
    """Die Reaktionsart einer Absicht. Alle Absichten, die nicht in `_SPECIAL_REACTIONS` stehen,
    bekommen einen festen Text; so landet eine neue Absicht nie aus Versehen beim Modell."""
    return _SPECIAL_REACTIONS.get(intent, ReactionKind.FIXED_TEXT)
