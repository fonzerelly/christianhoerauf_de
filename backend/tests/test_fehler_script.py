import json
from datetime import datetime
from pathlib import Path

from tests.fake_aws import run_with_fake_aws, start_time_seconds

# So schreibt die Lambda-Laufzeit ihre Zeilen (Textformat).
REPORT = (
    "REPORT RequestId: r1\tDuration: 812.34 ms\tBilled Duration: 813 ms\t"
    "Memory Size: 512 MB\tMax Memory Used: 91 MB\t"
)
REPORT_COLD = (
    "REPORT RequestId: r2\tDuration: 1234.56 ms\tBilled Duration: 1235 ms\t"
    "Memory Size: 512 MB\tMax Memory Used: 98 MB\tInit Duration: 456.78 ms\t"
)
EXCEPTION = (
    "[ERROR]\t2026-10-22T12:03:05.123Z\tr1\tUnerwarteter Fehler bei der Antwort\n"
    "Traceback (most recent call last):\n"
    '  File "/var/task/bot/handler.py", line 77, in handle\n'
    "RuntimeError: kaputt"
)
TIMEOUT = "2026-10-22T12:03:05.123Z r3 Task timed out after 30.00 seconds"


def record(outcome: str) -> str:
    return json.dumps(
        {
            "question": "Wie hoch ist die Zugspitze?",
            "intent": "general",
            "outcome": outcome,
            "answer": "…",
            "visitor": "a1b2c3",
            "duration_ms": 812,
        },
        ensure_ascii=False,
    )


def run(tmp_path: Path, messages: list[str], *args: str) -> str:
    return run_with_fake_aws("fehler.sh", tmp_path, messages, *args)


def test_without_any_lines_says_there_was_nothing(tmp_path: Path) -> None:
    assert run(tmp_path, []) == (
        "Aufrufe: 0\n\nFehler: keine\n\nFeste Antworten wegen Ausfall oder Grenze: keine\n"
    )


def test_summarizes_invocations_cold_starts_duration_and_memory(tmp_path: Path) -> None:
    output = run(tmp_path, ["START RequestId: r1", REPORT, REPORT_COLD])

    assert output.startswith(
        "Aufrufe: 2, davon 1 mit Kaltstart; längster 1235 ms, höchster Speicher 98 MB\n"
    )


def test_lists_each_error_with_time_and_indented_lines(tmp_path: Path) -> None:
    output = run(tmp_path, [REPORT, record("answered"), EXCEPTION, TIMEOUT])

    assert (
        "Fehler: 2\n"
        "22.10. 14:03\n"
        "  [ERROR]\t2026-10-22T12:03:05.123Z\tr1\tUnerwarteter Fehler bei der Antwort\n"
        "  Traceback (most recent call last):\n"
        '    File "/var/task/bot/handler.py", line 77, in handle\n'
        "  RuntimeError: kaputt\n"
        "22.10. 14:03\n"
        "  2026-10-22T12:03:05.123Z r3 Task timed out after 30.00 seconds\n"
    ) in output


def test_lists_fixed_answers_caused_by_outage_or_limits(tmp_path: Path) -> None:
    messages = [record("answered"), record("unavailable"), record("limit"), record("cache")]

    output = run(tmp_path, messages)

    assert output.endswith(
        "Feste Antworten wegen Ausfall oder Grenze: 2\n"
        "22.10. 14:03  unavailable  „Wie hoch ist die Zugspitze?“\n"
        "22.10. 14:03  limit  „Wie hoch ist die Zugspitze?“\n"
    )


def test_asks_aws_for_the_given_number_of_days(tmp_path: Path) -> None:
    run(tmp_path, [], "5")

    assert "--log-group-name /aws/lambda/christianhoerauf-bot" in (tmp_path / "args").read_text()
    assert abs(start_time_seconds(tmp_path) - (datetime.now().timestamp() - 5 * 86400)) < 120
