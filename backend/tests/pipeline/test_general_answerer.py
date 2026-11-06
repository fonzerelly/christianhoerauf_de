from datetime import datetime

import pytest

from bot.pipeline.general_answerer import GeneralAnswerer, now_sentence
from bot.ports.language_model import LanguageModelError
from tests.fakes import FakeClock, FakeLanguageModel, failing_model


def test_answerer_returns_the_model_text() -> None:
    answerer = GeneralAnswerer(FakeLanguageModel(["Canberra."]), "PROMPT")

    assert answerer.answer("Hauptstadt von Australien?") == "Canberra."


def test_answerer_sends_the_system_prompt_and_the_question() -> None:
    model = FakeLanguageModel(["ok"])

    GeneralAnswerer(model, "PROMPT").answer("Frage?")

    assert model.calls == [
        [{"role": "system", "content": "PROMPT"}, {"role": "user", "content": "Frage?"}]
    ]


def test_model_failure_is_passed_on() -> None:
    with pytest.raises(LanguageModelError):
        GeneralAnswerer(failing_model(), "PROMPT").answer("Frage?")


@pytest.mark.parametrize(
    ("moment", "sentence"),
    [
        (
            datetime(2026, 11, 5, 14, 30),
            "Heute ist Donnerstag, der 5. November 2026, es ist 14:30 Uhr.",
        ),
        (datetime(2027, 3, 28, 7, 5), "Heute ist Sonntag, der 28. März 2027, es ist 7:05 Uhr."),
    ],
)
def test_now_sentence_names_weekday_date_and_time(moment: datetime, sentence: str) -> None:
    assert now_sentence(moment) == sentence


def test_answerer_with_a_clock_puts_the_current_date_and_time_after_the_prompt() -> None:
    model = FakeLanguageModel(["56."])
    clock = FakeClock(now=datetime(2026, 11, 5, 14, 30))

    GeneralAnswerer(model, "PROMPT", clock=clock).answer("Wie alt?")

    assert model.calls[0][0] == {
        "role": "system",
        "content": "PROMPT\n\nHeute ist Donnerstag, der 5. November 2026, es ist 14:30 Uhr.",
    }
