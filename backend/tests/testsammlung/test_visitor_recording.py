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
from tests.test_handler import CAREER, KNOWLEDGE
from testsammlung.targets import LM_STUDIO_HOSTS, LmStudioHost
from testsammlung.visitor_paths import Node, read_nodes, write_nodes
from testsammlung.visitor_recording import (
    BotAsker,
    RecordingLog,
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

    record = BotAsker(bot, MemoryStore(), log, FakeClock().today)(
        "Wie hoch ist die Zugspitze?", "besucher-1", None
    )

    assert record.get("question") == "Wie hoch ist die Zugspitze?"
    assert record.get("answer") == "Knapp 3000 m."


BAKING = (
    "[[ ## antwort ## ]]\nChris backt Brot.\n\n"
    "[[ ## folgefragen ## ]]\nWas backt Chris am liebsten?"
)


def baking_bot(store: MemoryStore, log: RecordingLog, knowledge_answers: list[str]) -> Bot:
    """Ein Bot, dessen Türsteher nur einmal antwortet: Jede weitere Frage, die durch ihn müsste,
    scheitert mit „nicht erreichbar“."""
    return Bot(
        IntentClassifier(FakeLanguageModel([CAREER]), load_intent_program()),
        GeneralAnswerer(FakeLanguageModel([]), "P"),
        GeneralAnswerer(FakeLanguageModel([]), "T"),
        store,
        FakeClock(),
        log,
        "geheim",
        knowledge_answerer=GeneralAnswerer(FakeLanguageModel(knowledge_answers), "W"),
    )


def test_a_suggestion_of_the_parent_skips_the_gate_when_its_child_clicks_it() -> None:
    store, log = MemoryStore(), RecordingLog()
    asker = BotAsker(baking_bot(store, log, [BAKING, "Brezen."]), store, log, FakeClock().today)
    asker("Kann Chris backen?", "besucher-1", None)

    record = asker("Was backt Chris am liebsten?", "besucher-2", "besucher-1")

    assert (record.get("answer"), record.get("suggested")) == ("Brezen.", True)


def test_a_remembered_node_passes_its_suggestions_on_like_an_asked_one() -> None:
    store, log = MemoryStore(), RecordingLog()
    asker = BotAsker(baking_bot(store, log, ["Brezen."]), store, log, FakeClock().today)
    node = Node(
        1,
        None,
        "baeckerin",
        "start",
        "wissensbasis",
        (),
        "Kann Chris backen?",
        {"answer": "Ja.", "suggestions": ["Was backt Chris am liebsten?"]},
        {},
    )
    asker.remember(node, "besucher-1")

    record = asker("Was backt Chris am liebsten?", "besucher-2", "besucher-1")

    assert (record.get("answer"), record.get("suggested")) == ("Brezen.", True)


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


def test_main_resumes_a_recording_and_a_replayed_suggestion_still_skips_the_gate(
    monkeypatch: pytest.MonkeyPatch, server: FakeServer, tmp_path: Path
) -> None:
    monkeypatch.setitem(LM_STUDIO_HOSTS, "attrappe", LmStudioHost(server.base_url, "gemma"))
    knowledge_base = tmp_path / "wissensbasis"
    (knowledge_base / "stationen").mkdir(parents=True)
    (knowledge_base / "stationen" / "baeckerei.md").write_text("Chris backt Brot.", "utf-8")
    scenarios = tmp_path / "szenarien.yaml"
    scenarios.write_text(
        "- persona: baeckerin\n  beschreibung: d\n  fragen:\n"
        '    - {frage: "Kann Chris backen?", erwartet: wissensbasis}\n',
        "utf-8",
    )
    out = tmp_path / "aufzeichnung.jsonl"
    start = Node(
        1,
        None,
        "baeckerin",
        "start",
        "wissensbasis",
        (),
        "Kann Chris backen?",
        {
            "intent": "christian/career",
            "outcome": "answered",
            "answer": "Ja.",
            "suggestions": ["Was backt Chris?"],
        },
        {"Was backt Chris?": "christian/career"},
    )
    write_nodes([start], out)
    server.body = reply_body("Brezen.")  # als Türsteher unlesbar: gibberish

    main(
        [
            "--ziel",
            "attrappe",
            "--szenarien",
            str(scenarios),
            "--aus",
            str(out),
            "--wissensbasis",
            str(knowledge_base),
            "--tiefe",
            "1",
            "--fortsetzen",
        ]
    )

    nodes = read_nodes(out)
    assert nodes[0] == start
    assert nodes[1].question == "Was backt Chris?"
    assert nodes[1].record.get("suggested") is True
    assert nodes[1].record.get("answer") == "Brezen."
