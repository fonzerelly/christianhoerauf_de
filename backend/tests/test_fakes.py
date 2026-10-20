from datetime import date

import pytest

from bot.ports.language_model import LanguageModelError, Message
from tests.fakes import FakeClock, FakeLanguageModel, ListLog, failing_model


def test_fake_model_answers_in_order_and_records_calls() -> None:
    model = FakeLanguageModel(["eins", "zwei"])
    messages: list[Message] = [{"role": "user", "content": "hallo"}]

    assert model.complete(messages) == "eins"
    assert model.complete(messages) == "zwei"
    assert model.calls == [messages, messages]


def test_fake_model_raises_exceptions_from_the_list() -> None:
    with pytest.raises(LanguageModelError):
        failing_model().complete([])


def test_fake_clock_stands_still_on_the_date_and_advances_the_seconds() -> None:
    clock = FakeClock(step=2.0)

    assert clock.today() == date(2026, 10, 22)
    assert clock.seconds() == 102.0
    assert clock.seconds() == 104.0


def test_list_log_collects_records() -> None:
    log = ListLog()

    log.write({"a": 1})

    assert log.records == [{"a": 1}]
