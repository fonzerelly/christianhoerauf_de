from collections.abc import Mapping

import pytest

from bot.adapters.bedrock_token import BEDROCK_MODEL
from bot.adapters.openai_compatible import OpenAiCompatibleModel
from tests.conftest import FakeServer, reply_body
from testsammlung import targets
from testsammlung.targets import (
    DEFAULT_TARGET,
    LM_STUDIO_HOSTS,
    MEASUREMENT_TARGETS,
    TRAINING_TARGETS,
    LmStudioHost,
    build_target_model,
    model_name,
)

GEMMA = "google/gemma-4-26b-a4b-qat"


def test_the_hosts_are_the_mac_mini_and_the_dgx_spark_with_the_same_gemma() -> None:
    assert dict(LM_STUDIO_HOSTS) == {
        "macmini": LmStudioHost("http://192.168.178.91:1234/v1", GEMMA),
        "dgx": LmStudioHost("http://192.168.178.60:1235/v1", GEMMA),
    }


def test_measurements_may_use_bedrock_but_training_only_the_lm_studio_hosts() -> None:
    assert DEFAULT_TARGET == "macmini"
    assert MEASUREMENT_TARGETS == ("macmini", "dgx", "bedrock")
    assert TRAINING_TARGETS == ("macmini", "dgx")


def test_model_name_is_the_model_of_the_target() -> None:
    assert (model_name("dgx"), model_name("bedrock")) == (GEMMA, BEDROCK_MODEL)


def test_an_lm_studio_host_gets_its_url_and_model_without_a_key(
    monkeypatch: pytest.MonkeyPatch, server: FakeServer
) -> None:
    monkeypatch.setitem(LM_STUDIO_HOSTS, "attrappe", LmStudioHost(server.base_url, "gemma"))
    server.body = reply_body("Hallo.")

    model = build_target_model("attrappe", timeout_seconds=5, temperature=0.0, max_tokens=7)
    reply = model.complete([{"role": "user", "content": "Hi"}])

    (request,) = server.requests
    body = request["body"]
    assert isinstance(body, dict)
    assert reply == "Hallo."
    assert (body["model"], body.get("temperature"), body.get("max_tokens")) == ("gemma", 0.0, 7)
    assert request["authorization"] is None


def test_bedrock_is_built_like_the_bot_does_with_only_the_timeout_changed(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    seen: list[tuple[Mapping[str, str], float | None, int | None]] = []

    def recording_language_model(
        environ: Mapping[str, str], temperature: float | None = None, max_tokens: int | None = None
    ) -> OpenAiCompatibleModel:
        seen.append((dict(environ), temperature, max_tokens))
        return OpenAiCompatibleModel("http://127.0.0.1:1", "egal", None)

    monkeypatch.setattr(targets, "language_model", recording_language_model)

    build_target_model("bedrock", timeout_seconds=120, temperature=0.0, max_tokens=100)

    assert seen == [({"LLM_TIMEOUT_SECONDS": "120"}, 0.0, 100)]


@pytest.mark.parametrize("target", ["azure", "lmstudio"])
def test_an_unknown_target_is_rejected(target: str) -> None:
    with pytest.raises(ValueError, match=f"Unbekanntes Ziel: {target}"):
        build_target_model(target, timeout_seconds=5)
