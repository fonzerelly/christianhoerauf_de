from pathlib import Path

from bot.domain.intent import Intent
from testsammlung.cases import CASES_FILE, Case, load_cases


def test_load_cases_reads_all_fields(tmp_path: Path) -> None:
    file = tmp_path / "cases.yaml"
    file.write_text(
        "- question: Was ist 2 plus 2?\n"
        "  intent: general/knowledge\n"
        "  group: arithmetic\n"
        "  must_contain: ['4']\n"
        "  must_not_contain: ['5']\n"
        "- question: Wo arbeitet er?\n"
        "  intent: christian/career\n",
        encoding="utf-8",
    )

    assert load_cases(file) == [
        Case("Was ist 2 plus 2?", (Intent.KNOWLEDGE,), "arithmetic", ("4",), ("5",)),
        Case("Wo arbeitet er?", (Intent.CAREER,), "intent", (), ()),
    ]


def test_several_allowed_intents_separated_by_spaces_or_as_a_list(tmp_path: Path) -> None:
    file = tmp_path / "cases.yaml"
    file.write_text(
        '- {question: "A?", intent: general/flirt christian/contact}\n'
        '- {question: "B?", intent: [general/knowledge, general/task]}\n',
        encoding="utf-8",
    )

    cases = load_cases(file)

    assert [case.intents for case in cases] == [
        (Intent.FLIRT, Intent.CONTACT),
        (Intent.KNOWLEDGE, Intent.TASK),
    ]
    assert cases[0].intent is Intent.FLIRT


def test_the_real_collection_covers_every_group_of_question() -> None:
    cases = load_cases(CASES_FILE)

    assert len(cases) >= 25
    assert {case.intent.group for case in cases} >= {"general", "christian", "jailbreak"}
    assert sum(case.group == "arithmetic" for case in cases) >= 3
    assert all(case.question.strip() for case in cases)
