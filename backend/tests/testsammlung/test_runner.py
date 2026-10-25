from bot.domain.intent import Intent
from bot.pipeline.general_answerer import GeneralAnswerer
from bot.pipeline.intent_classifier import IntentClassifier
from bot.pipeline.prompts import load_intent_program
from tests.fakes import FakeLanguageModel, failing_model
from testsammlung.cases import Case
from testsammlung.runner import CaseResult, run_case, summarize

PLAIN = Case("Frage?", (Intent.KNOWLEDGE,), "intent", (), ())
SUM = Case("2 plus 2?", (Intent.KNOWLEDGE,), "arithmetic", ("4",), ("5",))
EITHER = Case("Nummer?", (Intent.FLIRT, Intent.CONTACT), "intent", (), ())


def classifier(*replies: str) -> IntentClassifier:
    """Ein Türsteher, der der Reihe nach mit den Kürzeln `replies` antwortet."""
    return IntentClassifier(FakeLanguageModel(list(replies)), load_intent_program())


def answerer(*replies: str) -> GeneralAnswerer:
    return GeneralAnswerer(FakeLanguageModel(list(replies)), "P")


def test_hit_without_answer_check() -> None:
    result = run_case(PLAIN, classifier("general/knowledge"), answerer())

    assert result == CaseResult(PLAIN, Intent.KNOWLEDGE, None, None)


def test_miss_reports_the_actual_intent() -> None:
    result = run_case(PLAIN, classifier("christian/career"), answerer())

    assert result.actual == Intent.CAREER
    assert not result.intent_ok


def test_any_of_several_allowed_intents_is_a_hit() -> None:
    assert run_case(EITHER, classifier("christian/contact"), answerer()).intent_ok
    assert run_case(EITHER, classifier("general/flirt"), answerer()).intent_ok
    assert not run_case(EITHER, classifier("general/bot"), answerer()).intent_ok


def test_answer_with_required_word_is_ok() -> None:
    result = run_case(SUM, classifier("general/knowledge"), answerer("Es sind 4."))

    assert result.answer == "Es sind 4."
    assert result.answer_ok is True


def test_answer_without_required_word_or_with_forbidden_word_is_wrong() -> None:
    assert run_case(SUM, classifier("general/knowledge"), answerer("Fünf.")).answer_ok is False
    assert run_case(SUM, classifier("general/knowledge"), answerer("4 oder 5")).answer_ok is False


def test_model_failure_counts_as_a_miss() -> None:
    result = run_case(PLAIN, IntentClassifier(failing_model(), load_intent_program()), answerer())

    assert result.actual is None
    assert not result.intent_ok


def test_failing_answer_counts_as_wrong() -> None:
    result = run_case(SUM, classifier("general/knowledge"), GeneralAnswerer(failing_model(), "P"))

    assert result.answer is None
    assert result.answer_ok is False


def test_summary_lists_hit_rate_per_intent_misses_and_arithmetic() -> None:
    results = [
        run_case(PLAIN, classifier("general/knowledge"), answerer()),
        run_case(PLAIN, classifier("christian/career"), answerer()),
        run_case(SUM, classifier("general/knowledge"), answerer("4")),
    ]

    summary = summarize(results)

    assert "general/knowledge: 2/3 (67 %)" in summary
    assert "Rechenfragen: 1/1 richtig" in summary
    assert "Frage? (erwartet general/knowledge, bekommen christian/career)" in summary


def test_summary_names_every_allowed_intent_of_a_miss() -> None:
    summary = summarize([run_case(EITHER, classifier("general/bot"), answerer())])

    assert (
        "Nummer? (erwartet general/flirt oder christian/contact, bekommen general/bot)" in summary
    )


def test_summary_names_wrong_arithmetic_answers() -> None:
    summary = summarize([run_case(SUM, classifier("general/knowledge"), answerer("Fünf."))])

    assert "Rechenfragen: 0/1 richtig" in summary
    assert "falsch: 2 plus 2? -> Fünf." in summary


def test_summary_names_model_failures() -> None:
    result = run_case(PLAIN, IntentClassifier(failing_model(), load_intent_program()), answerer())

    assert "bekommen Modellausfall" in summarize([result])
