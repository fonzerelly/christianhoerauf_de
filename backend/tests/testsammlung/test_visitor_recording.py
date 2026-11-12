"""Aufzeichnen mit den echten Bausteinen: Bot, Türsteher und Gemma als Besucher."""

import os
import subprocess
import sys
from pathlib import Path

import pytest

from bot.adapters.memory_store import MemoryStore
from bot.pipeline.bot import Bot
from bot.pipeline.general_answerer import GeneralAnswerer
from bot.pipeline.intent_classifier import IntentClassifier
from bot.pipeline.prompts import load_intent_program
from bot.ports.language_model import LanguageModelError
from tests.conftest import FakeServer, reply_body
from tests.fakes import FakeClock, FakeLanguageModel
from tests.test_handler import KNOWLEDGE
from testsammlung.targets import LM_STUDIO_HOSTS, LmStudioHost
from testsammlung.visitor_paths import read_nodes
from testsammlung.visitor_recording import (
    RecordingLog,
    bot_asker,
    gate_intent,
    main,
    visitor_questions,
)

BACKEND = Path(__file__).resolve().parents[2]


def test_bot_asker_returns_the_record_the_bot_wrote_for_the_question() -> None:
    log = RecordingLog()
    bot = Bot(
        IntentClassifier(FakeLanguageModel([KNOWLEDGE]), load_intent_program()),
        GeneralAnswerer(FakeLanguageModel(["Knapp 3000 m."]), "P"),
        GeneralAnswerer(FakeLanguageModel([]), "T"),
        MemoryStore(),
        FakeClock(),
        log,
        "geheim",
    )

    record = bot_asker(bot, log)("Wie hoch ist die Zugspitze?", "besucher-1")

    assert record.get("question") == "Wie hoch ist die Zugspitze?"
    assert record.get("answer") == "Knapp 3000 m."


def test_gate_intent_gives_the_label_or_ausgefallen_when_the_model_fails() -> None:
    working = IntentClassifier(FakeLanguageModel([KNOWLEDGE]), load_intent_program())
    broken = IntentClassifier(FakeLanguageModel([LanguageModelError("weg")]), load_intent_program())

    assert gate_intent(working)("Was ist Mehl?") == "general/knowledge"
    assert gate_intent(broken)("Was ist Mehl?") == "ausgefallen"


def test_visitor_questions_reads_one_question_per_line_without_list_markers() -> None:
    model = FakeLanguageModel(["1. Was ist ein Sauerteig?\n- Wie lange dauerte das?\nDanke!"])

    questions = visitor_questions(model)("Was backt Chris?", "Sauerteigbrot.")

    assert questions == ["Was ist ein Sauerteig?", "Wie lange dauerte das?"]
    assert "Was backt Chris?" in model.calls[0][-1]["content"]
    assert "Sauerteigbrot." in model.calls[0][-1]["content"]


def test_visitor_questions_gives_none_when_the_model_fails() -> None:
    model = FakeLanguageModel([LanguageModelError("weg")])

    assert visitor_questions(model)("Was backt Chris?", "Brot.") == []


def test_main_records_the_questions_of_the_scenarios(
    monkeypatch: pytest.MonkeyPatch,
    server: FakeServer,
    tmp_path: Path,
    capsys: pytest.CaptureFixture[str],
) -> None:
    monkeypatch.setitem(LM_STUDIO_HOSTS, "attrappe", LmStudioHost(server.base_url, "gemma"))
    server.body = reply_body(KNOWLEDGE)
    scenarios = tmp_path / "szenarien.yaml"
    scenarios.write_text(
        "- persona: baeckerin\n  beschreibung: d\n  fragen:\n"
        '    - {frage: "Wie hoch ist die Zugspitze?", erwartet: allgemein}\n'
        "- persona: nachbar\n  beschreibung: d\n  fragen:\n"
        '    - {frage: "Wie spät ist es?", erwartet: allgemein}\n',
        "utf-8",
    )
    out = tmp_path / "aufzeichnung.jsonl"

    exit_code = main(
        [
            "--ziel",
            "attrappe",
            "--szenarien",
            str(scenarios),
            "--aus",
            str(out),
            "--persona",
            "nachbar",
            "--wissensbasis",
            str(tmp_path),
        ]
    )

    assert exit_code == 0
    assert [node.question for node in read_nodes(out)] == ["Wie spät ist es?"]
    assert "1 Fragen aufgezeichnet" in capsys.readouterr().out


def test_called_as_a_module_an_unknown_target_ends_with_exit_code_2() -> None:
    result = subprocess.run(
        [sys.executable, "-m", "testsammlung.visitor_recording", "--ziel", "bedrock"],
        cwd=BACKEND,
        env={**os.environ, "PYTHONPATH": f"{BACKEND / 'src'}:{BACKEND}"},
        capture_output=True,
        text=True,
        timeout=60,
        check=False,
    )

    assert result.returncode == 2
    assert "bedrock" in result.stderr


def test_main_rejects_an_unknown_persona_with_exit_code_2(tmp_path: Path) -> None:
    scenarios = tmp_path / "szenarien.yaml"
    scenarios.write_text("- persona: baeckerin\n  beschreibung: d\n  fragen: []\n", "utf-8")

    with pytest.raises(SystemExit) as raised:
        main(["--szenarien", str(scenarios), "--persona", "konditor"])

    assert raised.value.code == 2
