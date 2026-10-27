import pytest

from bot.domain.fixed_answers import intent_answer
from bot.domain.intent import Intent
from bot.pipeline.prompts import load_intent_program, load_prompt


@pytest.mark.parametrize("name", ["general_answer", "task_answer", "knowledge_base_answer"])
def test_prompt_file_exists_and_states_the_length_and_language_rules(name: str) -> None:
    prompt = load_prompt(name)

    assert len(prompt) > 200
    assert "200 Zeichen" in prompt
    assert "Sprache der Frage" in prompt


def test_task_prompt_asks_for_a_short_version_with_a_wink() -> None:
    prompt = load_prompt("task_answer")

    assert "Kurzfassung" in prompt
    assert "Augenzwinkern" in prompt


def test_exported_intent_program_knows_every_intent() -> None:
    program = load_intent_program()

    assert program.labels == tuple(intent.value for intent in Intent)
    assert program.messages[0]["role"] == "system"


def test_knowledge_base_prompt_refuses_with_the_fixed_text_of_career() -> None:
    prompt = load_prompt("knowledge_base_answer")

    assert intent_answer(Intent.CAREER, "de").text in prompt
    assert intent_answer(Intent.CAREER, "en").text in prompt
    assert "dritten Person" in prompt
