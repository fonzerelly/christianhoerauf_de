from datetime import date

import pytest

from bot.pipeline.general_answerer import GeneralAnswerer, date_sentence
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
    ("day", "sentence"),
    [
        (date(2026, 11, 5), "Heute ist Donnerstag, der 5. November 2026."),
        (date(2027, 3, 28), "Heute ist Sonntag, der 28. März 2027."),
    ],
)
def test_date_sentence_names_weekday_day_month_and_year(day: date, sentence: str) -> None:
    assert date_sentence(day) == sentence


def test_answerer_with_a_clock_puts_todays_date_after_the_prompt() -> None:
    model = FakeLanguageModel(["56."])

    GeneralAnswerer(model, "PROMPT", clock=FakeClock(date(2026, 11, 5))).answer("Wie alt?")

    assert model.calls[0][0] == {
        "role": "system",
        "content": "PROMPT\n\nHeute ist Donnerstag, der 5. November 2026.",
    }
