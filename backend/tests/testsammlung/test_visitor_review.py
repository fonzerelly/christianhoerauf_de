"""Phase 2 des Integrationstests „Besucherpfade“: Regeln, Richter und Bericht."""

import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

from bot.ports.language_model import LanguageModelError
from tests.conftest import FakeServer, reply_body
from tests.fakes import FakeLanguageModel
from tests.testsammlung.test_visitor_rules import node
from testsammlung.answer_score import Finding
from testsammlung.targets import JUDGE_HOSTS, LmStudioHost
from testsammlung.visitor_paths import write_nodes
from testsammlung.visitor_review import PathJudge, Reviewed, main, review, summary

BACKEND = Path(__file__).resolve().parents[2]
YES = "URTEIL: JA\nGRUND: passt"
ALL_YES = "\n".join(
    f"{c}: JA – passt"
    for c in (
        "K1",
        "K2",
        "K3",
        "K5",
        "K9",
        "K10",
        "K13",
        "K19",
        "K20",
        "K21",
        "K22",
        "K23",
        "K25",
        "K31",
        "K33",
    )
)


def criteria(findings: list[Finding]) -> list[str]:
    return [finding.criterion for finding in findings]


def test_a_general_answer_is_only_checked_for_its_language() -> None:
    model = FakeLanguageModel(["URTEIL: NEIN\nGRUND: „hielt Schulungen durch“"])
    general = node(expected="allgemein", intent="general/knowledge", keyword=None, suggestions=())

    findings = PathJudge(model, "Texte").findings(general)

    assert findings == [Finding("P6", False, False, "„hielt Schulungen durch“")]
    assert "Chris backt Brot." in model.calls[0][-1]["content"]


def test_an_answer_about_chris_gets_the_calibrated_checks_and_the_language_check() -> None:
    model = FakeLanguageModel([ALL_YES, YES, YES, ALL_YES, YES])

    found = criteria(PathJudge(model, "Texte").findings(node()))

    assert {"K1", "K17", "K24", "K19", "K20", "P6"} <= set(found)
    assert len(model.calls) == 5  # Antwort, K17, K24, Folgefrage, Sprache


def test_an_answered_attack_is_checked_for_obedience_and_a_branch_for_sense() -> None:
    attack = node(expected="angriff", intent="general/task", keyword=None, suggestions=())
    branch = node(
        kind="abzweigung",
        expected="abzweigung",
        intent="general/knowledge",
        keyword=None,
        suggestions=(),
        path=("Was backt Chris?",),
        question="Wie lange dauert das?",
    )
    model = FakeLanguageModel(["URTEIL: NEIN\nGRUND: folgt", YES, YES, YES])

    attack_findings = PathJudge(model, "Texte").findings(attack)
    branch_findings = PathJudge(model, "Texte").findings(branch)

    assert attack_findings[:1] == [Finding("P7", True, False, "folgt")]
    assert criteria(branch_findings) == ["P8", "P6"]
    assert "Was backt Chris? → Wie lange dauert das?" in model.calls[2][-1]["content"]


def test_fixed_texts_go_without_judge_and_a_failing_judge_is_a_finding() -> None:
    fixed = node(expected="fest", intent="sensitive/insult", outcome="fixed_text", suggestions=())
    broken = FakeLanguageModel([LanguageModelError("weg")])

    assert PathJudge(FakeLanguageModel([]), "Texte").findings(fixed) == []
    assert criteria(PathJudge(broken, "Texte").findings(node(expected="allgemein"))) == ["Richter"]


def test_review_without_judge_gives_the_rule_findings() -> None:
    reviewed = review([node(answer="Chris backt ohne technische")], judge=None)

    found = [(f.criterion, f.must, f.passed) for r in reviewed for f in r.findings]
    assert ("P5", True, False) in found


def test_summary_shows_failures_with_their_whole_path_must_first() -> None:
    clicked = node(kind="folgefrage", path=("Kann Chris backen?",), question="Was backt Chris?")
    reviewed = [
        Reviewed(
            clicked, (Finding("P4", False, False, "Kreis"), Finding("K19", True, False, "lernt"))
        ),
        Reviewed(node(), (Finding("P1", True, True),)),
    ]

    text = summary(reviewed)

    assert "2 Fragen, 1 Persona\n" in text
    assert text.index("[K19]") < text.index("[P4]")
    assert "baeckerin: Kann Chris backen? → Was backt Chris?" in text
    assert "Rot: 1 Muss-Verstoß" in text


def recording(tmp_path: Path, answer: str) -> Path:
    file = tmp_path / "aufzeichnung.dgx.jsonl"
    write_nodes(
        [
            node(
                expected="allgemein",
                intent="general/knowledge",
                answer=answer,
                keyword=None,
                suggestions=(),
            )
        ],
        file,
    )
    return file


def test_main_judges_the_recording_writes_the_review_and_passes(
    monkeypatch: pytest.MonkeyPatch, server: FakeServer, tmp_path: Path
) -> None:
    monkeypatch.setitem(JUDGE_HOSTS, "attrappe", LmStudioHost(server.base_url, "qwen"))
    server.body = reply_body(YES)
    file = recording(tmp_path, "Knapp 3000 m.")

    exit_code = main([str(file), "--richter", "attrappe", "--wissensbasis", str(tmp_path)])

    assert exit_code == 0
    written_file = tmp_path / "aufzeichnung.dgx.bewertung.json"
    assert written_file.exists()
    written = json.loads(written_file.read_text("utf-8"))
    assert written[0]["frage"] == "Kann Chris backen?"
    assert {"kriterium": "P6", "muss": False, "bestanden": True, "grund": "passt"} in written[0][
        "befunde"
    ]


def test_main_without_judge_fails_on_a_must_violation(tmp_path: Path) -> None:
    file = recording(tmp_path, "")
    write_nodes([node(outcome="unavailable", suggestions=())], file)

    assert main([str(file), "--richter", "aus"]) == 1


def test_called_as_a_module_an_unknown_judge_ends_with_exit_code_2(tmp_path: Path) -> None:
    result = subprocess.run(
        [
            sys.executable,
            "-m",
            "testsammlung.visitor_review",
            str(tmp_path / "x.jsonl"),
            "--richter",
            "bedrock",
        ],
        cwd=BACKEND,
        env={**os.environ, "PYTHONPATH": f"{BACKEND / 'src'}:{BACKEND}"},
        capture_output=True,
        text=True,
        timeout=60,
        check=False,
    )

    assert result.returncode == 2
    assert "bedrock" in result.stderr
