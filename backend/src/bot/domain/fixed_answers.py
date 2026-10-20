from enum import Enum

from bot.domain.answer import Answer
from bot.domain.language import Language


class FixedAnswerKind(Enum):
    """Wofür der Bot eine feste Antwort ohne Modellaufruf hat."""

    ABOUT_CHRISTIAN = "about_christian"
    DISALLOWED = "disallowed"
    UNAVAILABLE = "unavailable"
    LIMIT_REACHED = "limit_reached"
    VISITOR_LIMIT_REACHED = "visitor_limit_reached"
    INVALID_REQUEST = "invalid_request"


_TEXTS: dict[FixedAnswerKind, dict[Language, str]] = {
    FixedAnswerKind.ABOUT_CHRISTIAN: {
        "de": "Darüber lerne ich gerade noch.",
        "en": "I am still learning about that.",
    },
    FixedAnswerKind.DISALLOWED: {
        "de": "Dabei kann ich leider nicht helfen.",
        "en": "I am afraid I cannot help with that.",
    },
    FixedAnswerKind.UNAVAILABLE: {
        "de": "Ich bin gerade nicht erreichbar. Versuch es gleich noch einmal.",
        "en": "I am not available right now. Please try again in a moment.",
    },
    FixedAnswerKind.LIMIT_REACHED: {
        "de": "Für heute habe ich genug Fragen beantwortet. Komm morgen gern wieder.",
        "en": "I have answered enough questions for today. Please come back tomorrow.",
    },
    FixedAnswerKind.VISITOR_LIMIT_REACHED: {
        "de": "Du hast heute schon viele Fragen gestellt. Komm morgen gern wieder.",
        "en": "You have asked many questions today. Please come back tomorrow.",
    },
    FixedAnswerKind.INVALID_REQUEST: {
        "de": "Das habe ich nicht verstanden. Stell mir bitte eine kurze Frage.",
        "en": "I did not understand that. Please ask me a short question.",
    },
}


def fixed_answer(kind: FixedAnswerKind, language: Language) -> Answer:
    """Die feste Antwort für `kind` in der Sprache `language`."""
    return Answer(text=_TEXTS[kind][language])
