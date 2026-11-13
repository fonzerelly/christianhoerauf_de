"""Der Umschreiber macht aus einer Nachfrage mit dem Verlauf eine eigenständige Frage (ADR 0005)."""

import pytest

from bot.pipeline.question_rewriter import Exchange, QuestionRewriter
from tests.fakes import FakeLanguageModel, failing_model

BEFORE = Exchange("Wo hat die Bäckerin gelernt?", "Sie lernte in der Backstube Krume in Kassel.")


def test_rewriter_sends_its_prompt_and_the_last_exchange_with_the_new_question() -> None:
    model = FakeLanguageModel(["Wie lange lernte die Bäckerin in der Backstube Krume?"])

    QuestionRewriter(model, "UMSCHREIBEN").rewrite("Wie lange war das?", BEFORE)

    assert model.calls == [
        [
            {"role": "system", "content": "UMSCHREIBEN"},
            {
                "role": "user",
                "content": "Vorige Frage: Wo hat die Bäckerin gelernt?\n"
                "Antwort des Chatbots: Sie lernte in der Backstube Krume in Kassel.\n"
                "Neue Frage: Wie lange war das?",
            },
        ]
    ]


def test_rewriter_returns_the_first_line_of_the_reply_without_spaces_around() -> None:
    model = FakeLanguageModel(["  Wie lange lernte die Bäckerin dort?  \nWeil …"])

    assert (
        QuestionRewriter(model, "P").rewrite("Wie lange war das?", BEFORE)
        == "Wie lange lernte die Bäckerin dort?"
    )


@pytest.mark.parametrize("reply", ["", "   \n  ", "x" * 501])
def test_an_empty_or_overlong_reply_keeps_the_question(reply: str) -> None:
    model = FakeLanguageModel([reply])

    assert (
        QuestionRewriter(model, "P").rewrite("Wie lange war das?", BEFORE) == "Wie lange war das?"
    )


def test_a_failing_model_keeps_the_question() -> None:
    assert (
        QuestionRewriter(failing_model(), "P").rewrite("Wie lange war das?", BEFORE)
        == "Wie lange war das?"
    )


def test_exchange_survives_its_round_trip_through_the_store() -> None:
    assert Exchange.from_json(BEFORE.to_json()) == BEFORE
