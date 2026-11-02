import pytest

from tests.conftest import FakeServer, reply_body
from testsammlung.runner import build_model
from testsammlung.targets import LM_STUDIO_HOSTS, LmStudioHost


def test_build_model_talks_to_the_target_without_own_temperature(
    monkeypatch: pytest.MonkeyPatch, server: FakeServer
) -> None:
    monkeypatch.setitem(LM_STUDIO_HOSTS, "attrappe", LmStudioHost(server.base_url, "gemma"))
    server.body = reply_body("Hallo.")

    build_model("attrappe").complete([{"role": "user", "content": "Hi"}])

    (request,) = server.requests
    body = request["body"]
    assert isinstance(body, dict)
    assert body["model"] == "gemma"
    assert "temperature" not in body


@pytest.mark.parametrize("target", ["macmini", "dgx", "bedrock"])
def test_every_measurement_target_builds_a_model_without_calling_it(target: str) -> None:
    assert build_model(target) is not None


def test_unknown_target_is_rejected() -> None:
    with pytest.raises(ValueError, match="Unbekanntes Ziel"):
        build_model("lmstudio")
