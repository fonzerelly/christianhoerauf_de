from pathlib import Path

import pytest

from bot.ports.language_model import LanguageModel
from tests.fakes import FakeLanguageModel
from testsammlung.runner import main


def test_main_runs_all_cases_and_prints_the_summary(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    cases = tmp_path / "cases.yaml"
    cases.write_text(
        "- question: Hauptstadt von Australien?\n  intent: general\n", encoding="utf-8"
    )
    model = FakeLanguageModel(["general"])

    def build_model(target: str) -> LanguageModel:
        assert target == "lmstudio"
        return model

    exit_code = main(["--cases", str(cases)], build_model)

    assert exit_code == 0
    assert "general: 1/1 (100 %)" in capsys.readouterr().out


def test_main_passes_the_target_to_the_model_builder(tmp_path: Path) -> None:
    cases = tmp_path / "cases.yaml"
    cases.write_text("- question: Frage?\n  intent: general\n", encoding="utf-8")
    seen: list[str] = []

    def build_model(target: str) -> LanguageModel:
        seen.append(target)
        return FakeLanguageModel(["general"])

    main(["--target", "bedrock", "--cases", str(cases)], build_model)

    assert seen == ["bedrock"]
