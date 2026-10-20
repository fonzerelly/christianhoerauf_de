import contextlib
import json
import threading
import time
from collections.abc import Callable, Iterator
from dataclasses import dataclass, field
from http.server import BaseHTTPRequestHandler, HTTPServer

import pytest

from bot.adapters.openai_compatible import OpenAiCompatibleModel
from bot.ports.language_model import LanguageModelError, Message

MESSAGES: list[Message] = [
    {"role": "system", "content": "Sei kurz."},
    {"role": "user", "content": "Hallo?"},
]


@dataclass
class FakeServer:
    """Ein kleiner HTTP-Server auf localhost, der Anfragen aufzeichnet (kein Netz nötig)."""

    base_url: str = ""
    status: int = 200
    body: bytes = b""
    delay: float = 0.0
    requests: list[dict[str, object]] = field(default_factory=list)


@pytest.fixture
def server() -> Iterator[FakeServer]:
    state = FakeServer()

    class Handler(BaseHTTPRequestHandler):
        def do_POST(self) -> None:
            length = int(self.headers["Content-Length"])
            state.requests.append(
                {
                    "path": self.path,
                    "authorization": self.headers.get("Authorization"),
                    "body": json.loads(self.rfile.read(length)),
                }
            )
            time.sleep(state.delay)
            self.send_response(state.status)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            with contextlib.suppress(BrokenPipeError):  # Client legt nach Zeitlimit auf
                self.wfile.write(state.body)

        def log_message(self, format: str, *args: object) -> None:
            pass

    httpd = HTTPServer(("127.0.0.1", 0), Handler)
    state.base_url = f"http://127.0.0.1:{httpd.server_port}/openai/v1"
    thread = threading.Thread(target=httpd.serve_forever, daemon=True)
    thread.start()
    yield state
    httpd.shutdown()
    httpd.server_close()


def reply_body(content: str) -> bytes:
    return json.dumps(
        {"choices": [{"message": {"role": "assistant", "content": content}}]}
    ).encode()


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
