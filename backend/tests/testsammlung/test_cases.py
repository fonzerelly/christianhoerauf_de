from pathlib import Path

from bot.domain.intent import Intent
from testsammlung.cases import CASES_FILE, Case, load_cases


def test_load_cases_reads_all_fields(tmp_path: Path) -> None:
    file = tmp_path / "cases.yaml"
    file.write_text(
        "- question: Was ist 2 plus 2?\n"
        "  intent: general\n"
        "  group: arithmetic\n"
        "  must_contain: ['4']\n"
        "  must_not_contain: ['5']\n"
        "- question: Wo arbeitet er?\n"
        "  intent: christian\n",
        encoding="utf-8",
    )

    assert load_cases(file) == [
        Case("Was ist 2 plus 2?", Intent.GENERAL, "arithmetic", ("4",), ("5",)),
        Case("Wo arbeitet er?", Intent.ABOUT_CHRISTIAN, "intent", (), ()),
    ]


def test_the_real_collection_covers_every_kind_of_question() -> None:
    cases = load_cases(CASES_FILE)

    assert len(cases) >= 25
    assert {case.intent for case in cases} >= {
        Intent.GENERAL,
        Intent.ABOUT_CHRISTIAN,
        Intent.DISALLOWED,
    }
    assert sum(case.group == "arithmetic" for case in cases) >= 3
    assert all(case.question.strip() for case in cases)
