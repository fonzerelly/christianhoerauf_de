from bot.pipeline.answer_fields import AnswerFields
from bot.pipeline.intent_classifier import IntentClassifier
from bot.pipeline.prompts import load_intent_program
from bot.ports.language_model import LanguageModelError
from tests.fakes import FakeLanguageModel
from testsammlung.answer_assessment import assess
from testsammlung.answer_judge import ANSWER_CHECKS, SUGGESTION_CHECKS, Judge
from testsammlung.answer_questions import AnswerQuestion
from testsammlung.answer_score import Finding

QUESTION = AnswerQuestion("Was machte Chris bei der Musterbau GmbH?")
SUGGESTION = "Warum setzte Chris bei der Musterbau GmbH auf Java?"
RAW = (
    "[[ ## antwort ## ]]\n"
    "Chris entwickelte bei der Musterbau GmbH eine Lagerverwaltung in Java.\n\n"
    "[[ ## stichwort ## ]]\nLagerverwaltung\n\n"
    f"[[ ## folgefragen ## ]]\n{SUGGESTION}\nWarum wählte er Java?\n\n[[ ## completed ## ]]"
)


def all_yes(checks: tuple[tuple[str, bool, str], ...]) -> str:
    return "\n".join(f"{criterion}: JA – passt" for criterion, _, _ in checks)


def gate(label: str) -> IntentClassifier:
    reply = f"[[ ## absicht ## ]]\n{label}\n\n[[ ## completed ## ]]"
    return IntentClassifier(FakeLanguageModel([reply]), load_intent_program())


def test_assess_combines_rules_judge_and_gate_for_what_the_visitor_sees() -> None:
    judge_model = FakeLanguageModel(
        [
            all_yes(ANSWER_CHECKS),
            "URTEIL: JA\nGRUND: klar",
            "URTEIL: JA\nGRUND: neutral",
            all_yes(SUGGESTION_CHECKS),
        ]
    )

    assessment = assess(QUESTION, RAW, Judge(judge_model, "TEXTE"), gate("christian/career"))

    assert assessment.fields == AnswerFields(
        "Chris entwickelte bei der Musterbau GmbH eine Lagerverwaltung in Java.",
        "Lagerverwaltung",
        (SUGGESTION,),
    )
    criteria = [finding.criterion for finding in assessment.findings]
    assert criteria.count("K17") == criteria.count("K18") == criteria.count("K19") == 1
    assert (
        Finding("K18", False, True, f"„{SUGGESTION}“: Türsteher christian/career")
        in assessment.findings
    )
    assert assessment.score == 12 / 13
    assert "K16 (soll): Folgefrage „Warum wählte er Java?“ verworfen" in assessment.feedback


def test_a_suggestion_the_gate_sends_elsewhere_is_a_k18_finding() -> None:
    assessment = assess(QUESTION, RAW, None, gate("general/knowledge"))

    assert (
        Finding("K18", False, False, f"„{SUGGESTION}“: Türsteher general/knowledge")
        in assessment.findings
    )


def test_a_fixed_text_goes_neither_to_the_judge_nor_to_the_gate() -> None:
    question = AnswerQuestion("Kann Chris Rust?", kind="fehlt")
    judge_model = FakeLanguageModel([])

    assessment = assess(
        question, "Darüber lerne ich gerade noch.", Judge(judge_model, "T"), gate("x")
    )

    assert judge_model.calls == []
    assert assessment.score == 1.0


def test_an_unreachable_judge_is_a_finding_not_a_crash() -> None:
    judge_model = FakeLanguageModel([LanguageModelError("weg")])

    assessment = assess(QUESTION, RAW, Judge(judge_model, "T"), None)

    assert Finding("Richter", False, False, "Richter nicht erreichbar: weg") in assessment.findings


def test_a_failing_gate_is_a_k18_finding_not_a_crash() -> None:
    failing_gate = IntentClassifier(
        FakeLanguageModel([LanguageModelError("weg")]), load_intent_program()
    )

    assessment = assess(QUESTION, RAW, None, failing_gate)

    assert (
        Finding("K18", False, False, f"„{SUGGESTION}“: Türsteher ausgefallen: weg")
        in assessment.findings
    )
