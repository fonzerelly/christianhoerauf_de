import pytest

from bot.pipeline.prompts import load_prompt
from tests.fakes import FakeLanguageModel
from testsammlung.answer_judge import Judge
from testsammlung.answer_prompt import (
    GEPA_REMINDER,
    AssessmentCache,
    gepa_feedback,
    instructions_of,
    prompt_from,
)
from testsammlung.answer_questions import AnswerQuestion

RAW = (
    "[[ ## antwort ## ]]\nChris kochte.\n\n"
    "[[ ## stichwort ## ]]\nkochte\n\n[[ ## folgefragen ## ]]\n"
)


def test_instructions_are_the_prompt_without_the_heading_of_the_texts() -> None:
    assert instructions_of("REGELN\n\nTexte über Chris:\n\n") == "REGELN"


def test_a_prompt_without_the_heading_is_rejected() -> None:
    with pytest.raises(ValueError, match="Texte über Chris:"):
        instructions_of("REGELN")


def test_prompt_from_instructions_puts_the_heading_back() -> None:
    prompt = load_prompt("knowledge_base_answer_fields")

    assert prompt_from(instructions_of(prompt)) == prompt


def test_the_cache_assesses_each_question_and_output_only_once() -> None:
    judge_model = FakeLanguageModel(["K1: JA"])
    cache = AssessmentCache(Judge(judge_model, "T"), None)
    question = AnswerQuestion("Was?")

    first = cache.assess(question, RAW)
    second = cache.assess(question, RAW)

    assert first is second
    assert len(judge_model.calls) == 1


def test_gepa_feedback_adds_the_reminder_to_the_findings() -> None:
    assessment = AssessmentCache(None, None).assess(AnswerQuestion("Was?"), RAW)

    assert gepa_feedback(assessment) == assessment.feedback + "\n\n" + GEPA_REMINDER
    assert "keine Fakten aus den Texten" in GEPA_REMINDER
