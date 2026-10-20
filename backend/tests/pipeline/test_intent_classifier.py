import pytest

from bot.domain.intent import Intent
from bot.pipeline.intent_classifier import IntentClassifier
from bot.ports.language_model import LanguageModelError
from tests.fakes import FakeLanguageModel, failing_model


@pytest.mark.parametrize(
    ("reply", "expected"),
    [
        ("general", Intent.GENERAL),
        ("christian", Intent.ABOUT_CHRISTIAN),
        ("gimmick", Intent.GIMMICK),
        ("disallowed", Intent.DISALLOWED),
        ("  Christian.\n", Intent.ABOUT_CHRISTIAN),
        ("**general**", Intent.GENERAL),
        ("Die Absicht ist: disallowed", Intent.DISALLOWED),
    ],
)
def test_reply_is_mapped_to_an_intent(reply: str, expected: Intent) -> None:
    classifier = IntentClassifier(FakeLanguageModel([reply]), "PROMPT")

    assert classifier.classify("Frage?") == expected


def test_unrecognizable_reply_counts_as_disallowed() -> None:
    classifier = IntentClassifier(FakeLanguageModel(["keine Ahnung"]), "PROMPT")

    assert classifier.classify("Frage?") == Intent.DISALLOWED


def test_classifier_sends_the_system_prompt_and_the_question() -> None:
    model = FakeLanguageModel(["general"])

    IntentClassifier(model, "PROMPT").classify("Wie spät ist es?")

    assert model.calls == [
        [
            {"role": "system", "content": "PROMPT"},
            {"role": "user", "content": "Wie spät ist es?"},
        ]
    ]


def test_model_failure_is_passed_on() -> None:
    with pytest.raises(LanguageModelError):
        IntentClassifier(failing_model(), "PROMPT").classify("Frage?")
