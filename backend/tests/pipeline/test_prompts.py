import pytest

from bot.pipeline.prompts import load_prompt


@pytest.mark.parametrize("name", ["intent", "general_answer"])
def test_prompt_file_exists_and_is_not_empty(name: str) -> None:
    assert len(load_prompt(name)) > 200


def test_intent_prompt_names_every_label() -> None:
    prompt = load_prompt("intent")

    for label in ["general", "christian", "gimmick", "disallowed"]:
        assert label in prompt


def test_answer_prompt_states_the_length_and_language_rules() -> None:
    prompt = load_prompt("general_answer")

    assert "200 Zeichen" in prompt
    assert "Sprache der Frage" in prompt
