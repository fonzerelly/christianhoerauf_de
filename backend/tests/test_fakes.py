import pytest

from bot.ports.language_model import LanguageModelError, Message
from tests.fakes import FakeLanguageModel, failing_model


def test_fake_model_answers_in_order_and_records_calls() -> None:
    model = FakeLanguageModel(["eins", "zwei"])
    messages: list[Message] = [{"role": "user", "content": "hallo"}]

    assert model.complete(messages) == "eins"
    assert model.complete(messages) == "zwei"
    assert model.calls == [messages, messages]


def test_fake_model_raises_exceptions_from_the_list() -> None:
    with pytest.raises(LanguageModelError):
        failing_model().complete([])
