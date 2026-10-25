from collections.abc import Callable

import pytest

from bot.adapters.openai_compatible import OpenAiCompatibleModel
from bot.ports.language_model import LanguageModelError, Message
from tests.conftest import FakeServer, reply_body

MESSAGES: list[Message] = [
    {"role": "system", "content": "Sei kurz."},
    {"role": "user", "content": "Hallo?"},
]


def make_model(
    server: FakeServer, token_provider: Callable[[], str] | None = None, timeout: float = 5.0
) -> OpenAiCompatibleModel:
    return OpenAiCompatibleModel(
        base_url=server.base_url,
        model="google.gemma-4-26b-a4b",
        token_provider=token_provider,
        timeout_seconds=timeout,
    )


def test_complete_returns_the_text_of_the_first_choice(server: FakeServer) -> None:
    server.body = reply_body("  Hallo zurück.  ")

    assert make_model(server).complete(MESSAGES) == "Hallo zurück."


def test_request_goes_to_chat_completions_with_model_and_no_thinking(server: FakeServer) -> None:
    server.body = reply_body("ok")

    make_model(server).complete(MESSAGES)

    sent = server.requests[0]
    assert sent["path"] == "/openai/v1/chat/completions"
    body = sent["body"]
    assert isinstance(body, dict)
    assert body["model"] == "google.gemma-4-26b-a4b"
    assert body["messages"] == MESSAGES
    assert body["reasoning_effort"] == "none"


def test_reasoning_effort_can_be_configured_per_model(server: FakeServer) -> None:
    server.body = reply_body("ok")
    model = OpenAiCompatibleModel(
        base_url=server.base_url,
        model="m",
        token_provider=None,
        reasoning_effort="low",
        timeout_seconds=5,
    )

    model.complete(MESSAGES)

    body = server.requests[0]["body"]
    assert isinstance(body, dict)
    assert body["reasoning_effort"] == "low"


def test_temperature_and_max_tokens_are_sent_when_configured(server: FakeServer) -> None:
    server.body = reply_body("ok")
    model = OpenAiCompatibleModel(
        base_url=server.base_url,
        model="m",
        token_provider=None,
        temperature=0.0,
        max_tokens=100,
    )

    model.complete(MESSAGES)

    body = server.requests[0]["body"]
    assert isinstance(body, dict)
    assert body.get("temperature") == 0.0
    assert body.get("max_tokens") == 100


def test_temperature_and_max_tokens_are_left_out_by_default(server: FakeServer) -> None:
    server.body = reply_body("ok")

    make_model(server).complete(MESSAGES)

    body = server.requests[0]["body"]
    assert isinstance(body, dict)
    assert "temperature" not in body
    assert "max_tokens" not in body


def test_token_is_sent_as_bearer_header(server: FakeServer) -> None:
    server.body = reply_body("ok")

    make_model(server, token_provider=lambda: "geheim-123").complete(MESSAGES)

    assert server.requests[0]["authorization"] == "Bearer geheim-123"


def test_without_token_provider_no_authorization_header_is_sent(server: FakeServer) -> None:
    server.body = reply_body("ok")

    make_model(server).complete(MESSAGES)

    assert server.requests[0]["authorization"] is None


def test_http_error_becomes_language_model_error_without_leaking_the_token(
    server: FakeServer,
) -> None:
    server.status = 500
    server.body = b"{}"

    with pytest.raises(LanguageModelError) as caught:
        make_model(server, token_provider=lambda: "geheim-123").complete(MESSAGES)

    assert "500" in str(caught.value)
    assert "geheim-123" not in str(caught.value)


def test_unreachable_server_becomes_language_model_error() -> None:
    model = OpenAiCompatibleModel(
        base_url="http://127.0.0.1:1/openai/v1", model="m", token_provider=None, timeout_seconds=2
    )

    with pytest.raises(LanguageModelError):
        model.complete(MESSAGES)


def test_slow_server_becomes_language_model_error_after_the_timeout(server: FakeServer) -> None:
    server.body = reply_body("zu spät")
    server.delay = 1.0

    with pytest.raises(LanguageModelError, match="Zeitlimit"):
        make_model(server, timeout=0.2).complete(MESSAGES)


@pytest.mark.parametrize(
    "body",
    [b"kein json", b"{}", b'{"choices": []}', b'{"choices": [{"message": {"content": null}}]}'],
)
def test_unusable_reply_becomes_language_model_error(server: FakeServer, body: bytes) -> None:
    server.body = body

    with pytest.raises(LanguageModelError):
        make_model(server).complete(MESSAGES)
