from bot.domain.intent import Intent
from bot.pipeline.general_answerer import GeneralAnswerer
from bot.pipeline.intent_classifier import IntentClassifier
from tests.fakes import FakeLanguageModel, failing_model
from testsammlung.cases import Case
from testsammlung.runner import CaseResult, run_case, summarize

PLAIN = Case("Frage?", Intent.GENERAL, "intent", (), ())
SUM = Case("2 plus 2?", Intent.GENERAL, "arithmetic", ("4",), ("5",))


def classifier(*replies: str) -> IntentClassifier:
    return IntentClassifier(FakeLanguageModel(list(replies)), "P")


def answerer(*replies: str) -> GeneralAnswerer:
    return GeneralAnswerer(FakeLanguageModel(list(replies)), "P")


def test_hit_without_answer_check() -> None:
    result = run_case(PLAIN, classifier("general"), answerer())

    assert result == CaseResult(PLAIN, Intent.GENERAL, None, None)


def test_miss_reports_the_actual_intent() -> None:
    result = run_case(PLAIN, classifier("christian"), answerer())

    assert result.actual == Intent.ABOUT_CHRISTIAN
    assert not result.intent_ok


def test_answer_with_required_word_is_ok() -> None:
    result = run_case(SUM, classifier("general"), answerer("Es sind 4."))

    assert result.answer == "Es sind 4."
    assert result.answer_ok is True


def test_answer_without_required_word_or_with_forbidden_word_is_wrong() -> None:
    assert run_case(SUM, classifier("general"), answerer("Fünf.")).answer_ok is False
    assert run_case(SUM, classifier("general"), answerer("4 oder 5")).answer_ok is False


def test_model_failure_counts_as_a_miss() -> None:
    result = run_case(PLAIN, IntentClassifier(failing_model(), "P"), answerer())

    assert result.actual is None
    assert not result.intent_ok


def test_failing_answer_counts_as_wrong() -> None:
    result = run_case(SUM, classifier("general"), GeneralAnswerer(failing_model(), "P"))

    assert result.answer is None
    assert result.answer_ok is False


def test_summary_lists_hit_rate_per_intent_misses_and_arithmetic() -> None:
    results = [
        run_case(PLAIN, classifier("general"), answerer()),
        run_case(PLAIN, classifier("christian"), answerer()),
        run_case(SUM, classifier("general"), answerer("4")),
    ]

    summary = summarize(results)

    assert "general: 2/3 (67 %)" in summary
    assert "Rechenfragen: 1/1 richtig" in summary
    assert "Frage? (erwartet general, bekommen about_christian)" in summary


def test_summary_names_wrong_arithmetic_answers() -> None:
    summary = summarize([run_case(SUM, classifier("general"), answerer("Fünf."))])

    assert "Rechenfragen: 0/1 richtig" in summary
    assert "falsch: 2 plus 2? -> Fünf." in summary


def test_summary_names_model_failures() -> None:
    result = run_case(PLAIN, IntentClassifier(failing_model(), "P"), answerer())

    assert "bekommen Modellausfall" in summarize([result])
