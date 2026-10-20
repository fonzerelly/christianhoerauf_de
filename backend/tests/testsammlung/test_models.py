import pytest

from bot.adapters.openai_compatible import OpenAiCompatibleModel
from testsammlung.runner import build_model


def test_lmstudio_target_builds_an_openai_compatible_model_without_token() -> None:
    assert isinstance(build_model("lmstudio"), OpenAiCompatibleModel)


def test_bedrock_target_builds_an_openai_compatible_model() -> None:
    assert isinstance(build_model("bedrock"), OpenAiCompatibleModel)


def test_unknown_target_is_rejected() -> None:
    with pytest.raises(ValueError, match="Unbekanntes Ziel"):
        build_model("azure")
