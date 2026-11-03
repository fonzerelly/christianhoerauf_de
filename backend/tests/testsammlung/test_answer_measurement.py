import json
from collections.abc import Sequence
from pathlib import Path

import pytest

from bot.pipeline.answer_fields import AnswerFields
from bot.ports.language_model import LanguageModel, LanguageModelError, Message
from tests.conftest import FakeServer, reply_body
from tests.fakes import FakeLanguageModel
from testsammlung import targets
from testsammlung.answer_assessment import Assessment
from testsammlung.answer_judge import ANSWER_CHECKS, SUGGESTION_CHECKS
from testsammlung.answer_measurement import (
    build_answer_model,
    build_judge,
    main,
    measure_answers,
    summary,
    system_prompt,
)
from testsammlung.answer_questions import AnswerQuestion
from testsammlung.answer_score import Finding
from testsammlung.targets import LM_STUDIO_HOSTS, LmStudioHost

RAW = (
    "[[ ## antwort ## ]]\nChris entwickelte bei der Musterbau GmbH eine Lagerverwaltung.\n\n"
    "[[ ## stichwort ## ]]\nLagerverwaltung\n\n"
    "[[ ## folgefragen ## ]]\nWarum setzte Chris bei der Musterbau GmbH auf Java?\n\n"
    "[[ ## completed ## ]]"
)


class AgreeingJudge:
    """Richter-Attrappe: sagt zu allem Ja, im Format der jeweiligen Prüfung."""

    def complete(self, messages: Sequence[Message]) -> str:
        if "URTEIL" in messages[0]["content"]:
            return "URTEIL: JA\nGRUND: gut"
        checks = ANSWER_CHECKS + SUGGESTION_CHECKS
        return "\n".join(f"{criterion}: JA" for criterion, _, _ in checks)


def gate_model() -> FakeLanguageModel:
    return FakeLanguageModel(
        ["[[ ## absicht ## ]]\nchristian/career\n\n[[ ## completed ## ]]"] * 10
    )


def test_system_prompt_puts_the_closing_after_the_texts() -> None:
    assert system_prompt("REGELN\nTexte über Chris:\n\n", "TEXTE", "SCHLUSS") == (
        "REGELN\nTexte über Chris:\n\nTEXTE\n\nSCHLUSS"
    )


def test_measure_answers_asks_each_question_per_round_then_assesses() -> None:
    model = FakeLanguageModel([RAW, RAW])
    question = AnswerQuestion("Was machte Chris bei der Musterbau GmbH?")

    assessments = measure_answers([question], model, "SYSTEM", None, None, rounds=2)

    assert (
        model.calls
        == [[{"role": "system", "content": "SYSTEM"}, {"role": "user", "content": question.text}]]
        * 2
    )
    assert [a.fields.keyword for a in assessments] == ["Lagerverwaltung"] * 2


def test_a_failing_answer_model_is_recorded_as_its_error() -> None:
    model = FakeLanguageModel([LanguageModelError("weg")])

    (assessment,) = measure_answers([AnswerQuestion("Was?")], model, "S", None, None, rounds=1)

    assert assessment.raw == "FEHLER: weg"


def assessment(suggestion_count: int, *findings: Finding) -> Assessment:
    suggestions = ("Was tat Chris?",) * suggestion_count
    return Assessment(AnswerQuestion("Was?"), "", AnswerFields("A", "Wort", suggestions), findings)


def test_summary_counts_scores_musts_completeness_and_failed_criteria() -> None:
    ok = Finding("K32", True, True)
    assessments = [
        assessment(2, ok, Finding("K11", False, False, "230 Zeichen")),
        assessment(
            1, Finding("K24", True, False, "Delikt"), Finding("K11", False, False, "3 Sätze")
        ),
    ]

    assert summary(assessments, "pruefen", 1) == (
        "Antworten: 2 (Teil pruefen, 1 Runde)\n"
        "Mittlere Note: 0.00\n"
        "Mit verletztem muss-Kriterium: 1 von 2\n"
        "Stichwort und Folgefrage vorhanden (K32): 1 von 1 geprüften\n"
        "Folgefragen je Antwort: 1.5\n"
        "Nicht bestanden, je Kriterium:\n"
        "  K11 (soll)  2\n"
        "  K24 (muss)  1"
    )


def test_main_measures_the_chosen_part_on_the_chosen_target_and_writes_the_details(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    questions = tmp_path / "fragen.yaml"
    questions.write_text(
        '- {frage: "Was machte Chris bei der Musterbau GmbH?", teil: pruefen}\n'
        '- {frage: "Nur zum Lernen?"}\n',
        "utf-8",
    )
    knowledge = tmp_path / "wissensbasis"
    (knowledge / "stationen").mkdir(parents=True)
    (knowledge / "stationen" / "musterbau.md").write_text("Musterbau-Text", "utf-8")
    prompt, closing = tmp_path / "prompt.md", tmp_path / "schluss.md"
    prompt.write_text("REGELN\n", "utf-8")
    closing.write_text("SCHLUSS", "utf-8")
    report = tmp_path / "bericht.json"
    answer_model = FakeLanguageModel([RAW])
    targets: list[str] = []

    def answers_on(target: str) -> LanguageModel:
        targets.append(target)
        return answer_model

    exit_code = main(
        [
            "--ziel",
            "dgx",
            "--fragen",
            str(questions),
            "--prompt",
            str(prompt),
            "--schluss",
            str(closing),
            "--wissensbasis",
            str(knowledge),
            "--aus",
            str(report),
        ],
        answer_model_factory=answers_on,
        judge_model_factory=AgreeingJudge,
        gate_model_factory=lambda target: gate_model(),
    )

    assert exit_code == 0
    assert targets == ["dgx"]
    system = answer_model.calls[0][0]["content"]
    assert system.startswith("REGELN\n# stationen/musterbau.md\n\nMusterbau-Text")
    assert system.endswith("\n\nSCHLUSS")
    (entry,) = json.loads(report.read_text("utf-8"))
    assert (entry["frage"], entry["stichwort"], entry["note"]) == (
        "Was machte Chris bei der Musterbau GmbH?",
        "Lagerverwaltung",
        1.0,
    )
    assert entry["befunde"][0].keys() == {"kriterium", "muss", "bestanden", "notiz"}
    assert "Antworten: 1 (Teil pruefen, 1 Runde)" in capsys.readouterr().out


def test_the_answer_model_is_gemma_on_the_target_with_the_server_defaults(
    monkeypatch: pytest.MonkeyPatch, server: FakeServer
) -> None:
    monkeypatch.setitem(LM_STUDIO_HOSTS, "attrappe", LmStudioHost(server.base_url, "gemma"))
    server.body = reply_body("Antwort")

    build_answer_model("attrappe").complete([{"role": "user", "content": "?"}])

    body = server.requests[0]["body"]
    assert isinstance(body, dict)
    assert (body["model"], "temperature" in body, "max_tokens" in body) == ("gemma", False, False)


def test_the_judge_is_qwen_with_room_for_all_verdicts(
    monkeypatch: pytest.MonkeyPatch, server: FakeServer
) -> None:
    monkeypatch.setattr(targets, "JUDGE_HOST", LmStudioHost(server.base_url, "qwen"))
    server.body = reply_body("K1: JA")

    build_judge().complete([{"role": "user", "content": "?"}])

    body = server.requests[0]["body"]
    assert isinstance(body, dict)
    assert (body["model"], body["temperature"], body["max_tokens"]) == ("qwen", 0.0, 600)
