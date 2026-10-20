import pytest

from bot.pipeline.general_answerer import GeneralAnswerer
from bot.ports.language_model import LanguageModelError
from tests.fakes import FakeLanguageModel, failing_model


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
