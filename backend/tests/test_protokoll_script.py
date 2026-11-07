import json
from datetime import datetime
from pathlib import Path

from tests.fake_aws import run_with_fake_aws, start_time_seconds


def record(visitor: str = "a1b2c3", **changes: object) -> str:
    fields: dict[str, object] = {
        "question": "Wie hoch ist die Zugspitze?",
        "intent": "general",
        "outcome": "answered",
        "answer": "2962 m.",
        "visitor": visitor,
        "duration_ms": 812,
    }
    fields.update(changes)
    return json.dumps(fields, ensure_ascii=False)


def run(tmp_path: Path, messages: list[str], *args: str) -> str:
    return run_with_fake_aws("protokoll.sh", tmp_path, messages, *args)


def test_prints_each_question_with_time_intent_outcome_and_answer(tmp_path: Path) -> None:
    output = run(tmp_path, [record()])

    assert output == (
        "22.10. 14:03  general → answered  812 ms  [a1b2c3]\n"
        "  F: Wie hoch ist die Zugspitze?\n"
        "  A: 2962 m.\n"
        "\n"
        "1 Fragen von 1 Besuchern\n"
    )


def test_skips_other_lines_and_counts_distinct_visitors(tmp_path: Path) -> None:
    messages = ["REPORT RequestId: 123", '{"level": "info"}', record(), record(), record("ffffff")]

    output = run(tmp_path, messages)

    assert output.count("  F: ") == 3
    assert output.endswith("3 Fragen von 2 Besuchern\n")


def test_writes_a_dash_for_a_missing_intent(tmp_path: Path) -> None:
    output = run(tmp_path, [record(intent=None, outcome="limit")])

    assert "  – → limit" in output


def test_asks_aws_for_the_bot_log_of_the_given_number_of_days(tmp_path: Path) -> None:
    run(tmp_path, [record()], "7")

    assert "--log-group-name /aws/lambda/christianhoerauf-bot" in (tmp_path / "args").read_text()
    assert abs(start_time_seconds(tmp_path) - (datetime.now().timestamp() - 7 * 86400)) < 120


def test_prints_keyword_and_suggestions_of_a_knowledge_answer(tmp_path: Path) -> None:
    knowledge = record(
        answer="Chris baute Spracherkennung.",
        keyword="Navigon Highlights",
        suggestions=["Was erlebte Chris mit der Polizei?", "Warum nutzte Chris C++?"],
    )

    output = run(tmp_path, [knowledge])

    assert (
        "  A: Chris baute Spracherkennung.\n"
        "  S: Navigon Highlights\n"
        "  ?: Was erlebte Chris mit der Polizei?\n"
        "  ?: Warum nutzte Chris C++?\n"
    ) in output


def test_marks_a_question_that_was_a_suggested_follow_up(tmp_path: Path) -> None:
    output = run(tmp_path, [record(intent="christian/career", suggested=True)])

    assert "christian/career → answered (Folgefrage)  812 ms" in output
