from testsammlung.answer_score import Finding, feedback, score

MUST_OK = Finding("K1", must=True, passed=True)
MUST_FAILED = Finding(
    "K24", must=True, passed=False, note="„Warum hielt die Polizei Chris an?“: klingt nach Delikt"
)
SHOULD_OK = Finding("K23", must=False, passed=True)
SHOULD_FAILED = Finding("K11", must=False, passed=False, note="230 Zeichen")


def test_score_is_the_share_of_passed_should_criteria() -> None:
    assert score([MUST_OK, SHOULD_OK, SHOULD_FAILED, SHOULD_OK]) == 2 / 3


def test_score_is_0_when_a_must_criterion_failed() -> None:
    assert score([MUST_FAILED, SHOULD_OK]) == 0.0


def test_score_is_1_without_should_criteria_and_without_failed_musts() -> None:
    assert score([MUST_OK]) == 1.0


def test_feedback_lists_every_failed_criterion_must_first() -> None:
    assert feedback([SHOULD_FAILED, MUST_OK, MUST_FAILED, SHOULD_OK]) == (
        "Nicht bestanden:\n"
        "- K24 (muss): „Warum hielt die Polizei Chris an?“: klingt nach Delikt\n"
        "- K11 (soll): 230 Zeichen"
    )


def test_feedback_says_so_when_everything_passed() -> None:
    assert feedback([MUST_OK, SHOULD_OK]) == "Alle Kriterien bestanden."
