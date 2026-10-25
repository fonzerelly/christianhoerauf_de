"""Gemeinsame Testhelfer: ein kleiner HTTP-Server auf localhost als Attrappe des Modellservers."""

import contextlib
import json
import threading
import time
from collections.abc import Iterator
from dataclasses import dataclass, field
from http.server import BaseHTTPRequestHandler, HTTPServer

import pytest


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
