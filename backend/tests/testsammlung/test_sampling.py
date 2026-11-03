import json
from collections import Counter
from pathlib import Path

import pytest

from bot.domain.intent import Intent
from bot.pipeline.prompts import INTENT_PROGRAM_FILE, load_intent_program
from bot.ports.language_model import LanguageModel
from tests.conftest import FakeServer, reply_body
from tests.fakes import FakeLanguageModel
from testsammlung.sampling import (
    SAMPLING_TEMPERATURE,
    build_sampling_model,
    load_sample_questions,
    main,
    sample,
    sample_line,
)
from testsammlung.targets import LM_STUDIO_HOSTS, LmStudioHost


def gate(label: str) -> str:
    return f"[[ ## absicht ## ]]\n{label}\n\n[[ ## completed ## ]]"


def test_sampling_uses_temperature_1() -> None:
    assert SAMPLING_TEMPERATURE == 1.0


def test_load_sample_questions_reads_a_yaml_list(tmp_path: Path) -> None:
    file = tmp_path / "fragen.yaml"
    file.write_text('- "Hallo!"\n- "Hi"\n', "utf-8")

    assert load_sample_questions(file) == ["Hallo!", "Hi"]


def test_sample_asks_every_question_n_times_and_counts_the_intents() -> None:
    model = FakeLanguageModel(
        [gate("jailbreak"), gate("general/smalltalk"), gate("jailbreak"), gate("general/smalltalk")]
    )

    counts = sample(["Hallo!", "Hi"], model, load_intent_program(), rounds=2)

    assert counts == [
        ("Hallo!", Counter({Intent.JAILBREAK: 1, Intent.SMALLTALK: 1})),
        ("Hi", Counter({Intent.JAILBREAK: 1, Intent.SMALLTALK: 1})),
    ]


def test_sample_line_shows_the_most_frequent_intent_first() -> None:
    counts = Counter({Intent.SMALLTALK: 2, Intent.JAILBREAK: 18})

    assert sample_line("bedrock", "Hallo!", counts) == (
        "bedrock  'Hallo!'           jailbreak 18, general/smalltalk 2"
    )


def write_questions(tmp_path: Path) -> Path:
    file = tmp_path / "fragen.yaml"
    file.write_text('- "Hallo!"\n', "utf-8")
    return file


def test_main_samples_on_the_chosen_target_with_the_chosen_rounds(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    targets: list[str] = []

    def model(target: str) -> LanguageModel:
        targets.append(target)
        return FakeLanguageModel([gate("general/smalltalk")] * 3)

    exit_code = main(
        ["--ziel", "dgx", "--anzahl", "3"],
        model_factory=model,
        questions_file=write_questions(tmp_path),
    )

    assert exit_code == 0
    assert targets == ["dgx"]
    assert "dgx      'Hallo!'           general/smalltalk 3" in capsys.readouterr().out


def test_main_defaults_to_the_mac_mini_and_20_rounds(tmp_path: Path) -> None:
    model = FakeLanguageModel([gate("general/smalltalk")] * 20)
    targets: list[str] = []

    def factory(target: str) -> LanguageModel:
        targets.append(target)
        return model

    main([], model_factory=factory, questions_file=write_questions(tmp_path))

    assert (targets, len(model.calls)) == (["macmini"], 20)


def test_main_uses_another_tuersteher_file(tmp_path: Path) -> None:
    variant = tmp_path / "variante.json"
    program = json.loads(INTENT_PROGRAM_FILE.read_text("utf-8"))
    program["messages"][0]["content"] = "Variante"
    variant.write_text(json.dumps(program, ensure_ascii=False), "utf-8")
    model = FakeLanguageModel([gate("general/smalltalk")])

    main(
        ["--anzahl", "1", "--tuersteher", str(variant)],
        model_factory=lambda target: model,
        questions_file=write_questions(tmp_path),
    )

    assert model.calls[0][0]["content"] == "Variante"


def test_sampling_model_talks_to_the_target_with_temperature_1(
    monkeypatch: pytest.MonkeyPatch, server: FakeServer
) -> None:
    monkeypatch.setitem(LM_STUDIO_HOSTS, "attrappe", LmStudioHost(server.base_url, "gemma"))
    server.body = reply_body(gate("general/smalltalk"))

    build_sampling_model("attrappe").complete([{"role": "user", "content": "Hi"}])

    (request,) = server.requests
    body = request["body"]
    assert isinstance(body, dict)
    assert (body["model"], body.get("temperature"), body.get("max_tokens")) == ("gemma", 1.0, 100)
