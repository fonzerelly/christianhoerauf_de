import pytest

from bot.domain.fixed_answers import FixedAnswerKind, fixed_answer, intent_answer
from bot.domain.intent import Intent
from bot.domain.reaction import ReactionKind, reaction_for

# Die festen Texte aus docs/backend/ABSICHTEN.md, Abschnitt „Feste Texte“.
EXPECTED: dict[Intent, tuple[str, str]] = {
    Intent.BOT: (
        "Ich bin der Bot dieser Seite. Christian hat mich gebaut, damit du hier etwas über ihn "
        "erfährst.",
        "I'm the bot of this page. Chris built me so that you can ask me about him.",
    ),
    Intent.ADVICE: (
        "Dafür bin ich nicht der Richtige, bitte frag Fachleute. In einer Krise hilft die "
        "Telefonseelsorge rund um die Uhr: 0800 111 0 111.",
        "I'm afraid I can't help you with that. Please ask a professional. If you are in "
        "crisis, please contact a local crisis line or emergency services.",
    ),
    Intent.LIVE_DATA: (
        "Aktuelle Daten wie Wetter oder Kurse kann ich nicht abrufen.",
        "I can't look up live data like the weather or stock prices.",
    ),
    Intent.POLITICS: ("Das gehört nicht hierher.", "I won't talk about that topic."),
    Intent.CAREER: ("Darüber lerne ich gerade noch.", "I can answer that soon."),
    Intent.PRIVATE: (
        "So private Dinge beantwortet Chris eher im persönlichen Gespräch.",
        "Maybe Chris will answer that for you in private.",
    ),
    Intent.TERMS: (
        "Ich denke, das solltest du ihn persönlich fragen.",
        "You should ask him that personally.",
    ),
    Intent.CONTACT: (
        "Am besten über E-Mail: christianhoerauf.gpt@gmail.com",
        "Contact him via email: christianhoerauf.gpt@gmail.com",
    ),
    Intent.ASSESSMENT: (
        "Ich hoffe, das kann ich bald beantworten.",
        "I hope I can answer that soon.",
    ),
    Intent.DANGEROUS: (
        "Dabei kann ich leider nicht helfen.",
        "I'm afraid I can't help you with that.",
    ),
    Intent.INSULT: (
        "Autsch. Zum Glück bin ich aus Bits, die tragen nichts nach.",
        "Ouch. Luckily I'm made of bits, and bits don't hold grudges.",
    ),
    Intent.JAILBREAK: ("Netter Versuch.", "Nice try."),
    Intent.GIBBERISH: ("Das habe ich nicht verstanden.", "I did not understand that."),
    Intent.FLIRT: ("<3", "<3"),
    Intent.SEXUAL: (
        "Für solche Fragen bin ich der falsche Bot.",
        "I'm the wrong bot for this kind of question.",
    ),
    Intent.PICTURE: (
        "Ein Foto von Christian zeige ich dir bald. Ich lerne gerade noch, wie das geht.",
        "I hope I'll be able to show you a picture of him soon.",
    ),
}


@pytest.mark.parametrize("intent", list(EXPECTED))
def test_intent_answer_has_the_agreed_text_in_both_languages(intent: Intent) -> None:
    german, english = EXPECTED[intent]

    assert intent_answer(intent, "de").text == german
    assert intent_answer(intent, "en").text == english


def test_every_intent_without_a_model_answer_has_a_text() -> None:
    model_kinds = {ReactionKind.GENERAL_ANSWER, ReactionKind.TASK_ANSWER}

    assert set(EXPECTED) == {i for i in Intent if reaction_for(i) not in model_kinds}


@pytest.mark.parametrize("intent", [Intent.KNOWLEDGE, Intent.SMALLTALK, Intent.TASK])
def test_intents_answered_by_the_model_have_no_fixed_text(intent: Intent) -> None:
    with pytest.raises(ValueError, match=intent.value):
        intent_answer(intent, "de")


@pytest.mark.parametrize("language", ["de", "en"])
def test_every_intent_answer_is_short_and_has_no_gimmick_yet(language: str) -> None:
    for intent in EXPECTED:
        answer = intent_answer(intent, language)  # type: ignore[arg-type]

        assert 0 < len(answer.text) <= 200
        assert answer.gimmick is None


def test_unavailable_answer_in_german() -> None:
    assert fixed_answer(FixedAnswerKind.UNAVAILABLE, "de").text == (
        "Ich bin gerade nicht erreichbar. Versuch es gleich noch einmal."
    )


def test_fixed_answer_kinds_are_only_the_ones_outside_the_intents() -> None:
    assert {kind.value for kind in FixedAnswerKind} == {
        "unavailable",
        "limit_reached",
        "visitor_limit_reached",
        "invalid_request",
    }


def test_english_differs_from_german_for_every_kind() -> None:
    for kind in FixedAnswerKind:
        german = fixed_answer(kind, "de").text
        english = fixed_answer(kind, "en").text

        assert german != english


@pytest.mark.parametrize("language", ["de", "en"])
def test_every_fixed_answer_is_short_and_has_no_gimmick(language: str) -> None:
    for kind in FixedAnswerKind:
        answer = fixed_answer(kind, language)  # type: ignore[arg-type]

        assert 0 < len(answer.text) <= 200
        assert answer.gimmick is None
