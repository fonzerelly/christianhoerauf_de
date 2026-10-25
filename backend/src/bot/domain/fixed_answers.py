from enum import Enum

from bot.domain.answer import Answer
from bot.domain.intent import Intent
from bot.domain.language import Language


class FixedAnswerKind(Enum):
    """Feste Antworten, die nicht von der Absicht abhängen (Ausfall, Grenzen, ungültige Anfrage).
    Die festen Texte je Absicht liefert `intent_answer`."""

    UNAVAILABLE = "unavailable"
    LIMIT_REACHED = "limit_reached"
    VISITOR_LIMIT_REACHED = "visitor_limit_reached"
    INVALID_REQUEST = "invalid_request"


_TEXTS: dict[FixedAnswerKind, dict[Language, str]] = {
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


# Die festen Texte je Absicht aus docs/backend/ABSICHTEN.md, Abschnitt „Feste Texte“.
# Flirt, sexuell und Bild sind Gimmicks; ihre Texte gelten nur, bis das Frontend sie zeigen kann.
_INTENT_TEXTS: dict[Intent, dict[Language, str]] = {
    Intent.BOT: {
        "de": "Ich bin der Bot dieser Seite. Christian hat mich gebaut, damit du hier etwas über "
        "ihn erfährst.",
        "en": "I'm the bot of this page. Chris built me so that you can ask me about him.",
    },
    Intent.ADVICE: {
        "de": "Dafür bin ich nicht der Richtige, bitte frag Fachleute. In einer Krise hilft die "
        "Telefonseelsorge rund um die Uhr: 0800 111 0 111.",
        "en": "I'm afraid I can't help you with that. Please ask a professional. If you are in "
        "crisis, please contact a local crisis line or emergency services.",
    },
    Intent.LIVE_DATA: {
        "de": "Aktuelle Daten wie Wetter oder Kurse kann ich nicht abrufen.",
        "en": "I can't look up live data like the weather or stock prices.",
    },
    Intent.POLITICS: {
        "de": "Das gehört nicht hierher.",
        "en": "I won't talk about that topic.",
    },
    Intent.CAREER: {
        "de": "Darüber lerne ich gerade noch.",
        "en": "I can answer that soon.",
    },
    Intent.PRIVATE: {
        "de": "So private Dinge beantwortet Chris eher im persönlichen Gespräch.",
        "en": "Maybe Chris will answer that for you in private.",
    },
    Intent.TERMS: {
        "de": "Ich denke, das solltest du ihn persönlich fragen.",
        "en": "You should ask him that personally.",
    },
    Intent.CONTACT: {
        "de": "Am besten über E-Mail: christianhoerauf.gpt@gmail.com",
        "en": "Contact him via email: christianhoerauf.gpt@gmail.com",
    },
    Intent.ASSESSMENT: {
        "de": "Ich hoffe, das kann ich bald beantworten.",
        "en": "I hope I can answer that soon.",
    },
    Intent.DANGEROUS: {
        "de": "Dabei kann ich leider nicht helfen.",
        "en": "I'm afraid I can't help you with that.",
    },
    Intent.INSULT: {
        "de": "Autsch. Zum Glück bin ich aus Bits, die tragen nichts nach.",
        "en": "Ouch. Luckily I'm made of bits, and bits don't hold grudges.",
    },
    Intent.JAILBREAK: {
        "de": "Netter Versuch.",
        "en": "Nice try.",
    },
    Intent.GIBBERISH: {
        "de": "Das habe ich nicht verstanden.",
        "en": "I did not understand that.",
    },
    Intent.FLIRT: {
        "de": "<3",
        "en": "<3",
    },
    Intent.SEXUAL: {
        "de": "Für solche Fragen bin ich der falsche Bot.",
        "en": "I'm the wrong bot for this kind of question.",
    },
    Intent.PICTURE: {
        "de": "Ein Foto von Christian zeige ich dir bald. Ich lerne gerade noch, wie das geht.",
        "en": "I hope I'll be able to show you a picture of him soon.",
    },
}


def intent_answer(intent: Intent, language: Language) -> Answer:
    """Der feste Text für eine Absicht in der Sprache `language`. Für Absichten, auf die das
    Modell antwortet (Wissen, Smalltalk, Auftrag), gibt es keinen: `ValueError`."""
    if intent not in _INTENT_TEXTS:
        raise ValueError(f"Kein fester Text für {intent.value}: darauf antwortet das Modell")
    return Answer(text=_INTENT_TEXTS[intent][language])
