"""Das lokale Backend für den Vite-Entwicklungsserver (`npm run dev` im Frontend)."""

import json
import os
import subprocess
import sys
import threading
import urllib.error
import urllib.request
from collections.abc import Iterator
from http.server import HTTPServer
from pathlib import Path

import pytest

from bot.adapters.cv_files import read_cv_data
from bot.domain.public_cv import CvData
from bot.handler import handle_cv
from tests.conftest import FakeServer, reply_body
from tests.test_handler import KNOWLEDGE, make_bot
from tests.test_handler_cv import write_sources
from testsammlung.local_backend import (
    WARM_UP_QUESTION,
    LocalBackend,
    local_environ,
    make_server,
    start,
)
from testsammlung.targets import LM_STUDIO_HOSTS, LmStudioHost

BACKEND = Path(__file__).resolve().parents[2]


@pytest.fixture
def cv_data(tmp_path: Path) -> CvData:
    knowledge_base, cv_folder = write_sources(tmp_path)
    return read_cv_data(knowledge_base, cv_folder / "varianten.yaml")


def question(text: str) -> str:
    return json.dumps({"question": text})


def text_of(response: dict[str, object]) -> object:
    return json.loads(str(response.get("body", "{}"))).get("text")


def fetch(request: urllib.request.Request | str) -> tuple[int, dict[str, str], bytes]:
    """Status, Kopfzeilen und Inhalt; auch bei Fehlerstatus, statt eine Ausnahme zu werfen."""
    try:
        with urllib.request.urlopen(request, timeout=10) as reply:
            return reply.status, dict(reply.headers), reply.read()
    except urllib.error.HTTPError as error:
        return error.code, dict(error.headers), error.read()


def test_local_environ_points_the_bot_at_gemma_on_the_chosen_host(tmp_path: Path) -> None:
    environ = local_environ("dgx", tmp_path / "wissensbasis", tmp_path / "lebenslauf")

    assert environ == {
        "VISITOR_SECRET": "lokal",
        "LLM_BASE_URL": "http://192.168.178.60:1235/v1",
        "LLM_MODEL": "google/gemma-4-26b-a4b-qat",
        "LLM_AUTH": "none",
        "LLM_TIMEOUT_SECONDS": "120",
        "WISSENSBASIS_DIR": str(tmp_path / "wissensbasis"),
        "LEBENSLAUF_DIR": str(tmp_path / "lebenslauf"),
    }


def test_a_question_is_answered_by_the_bot_like_in_the_lambda(cv_data: CvData) -> None:
    backend = LocalBackend(make_bot([KNOWLEDGE], ["Knapp 3000 m."]), cv_data)

    response = backend.respond("POST", "/", question("Wie hoch ist die Zugspitze?"))

    assert response.get("statusCode") == 200
    assert text_of(response) == "Knapp 3000 m."


def test_every_request_is_a_new_visitor_so_the_visitor_limit_never_applies(
    cv_data: CvData,
) -> None:
    answers: list[str | Exception] = [f"Antwort {number}." for number in range(12)]
    backend = LocalBackend(make_bot([KNOWLEDGE] * 12, answers), cv_data)

    texts = [text_of(backend.respond("POST", "/", question(f"Frage {n}?"))) for n in range(12)]

    assert texts == answers


def test_get_lebenslauf_gives_the_cv_of_the_variant_from_the_query(cv_data: CvData) -> None:
    number = cv_data.variants["ohne_kurse_mit_brot"].number
    backend = LocalBackend(make_bot([]), cv_data)

    response = backend.respond("GET", f"/lebenslauf?variante={number}", None)

    expected = handle_cv({"queryStringParameters": {"variante": str(number)}}, cv_data)
    assert response == expected


def test_the_http_server_answers_with_cors_headers_for_the_dev_server(cv_data: CvData) -> None:
    httpd = make_server(LocalBackend(make_bot([KNOWLEDGE], ["Hallo."]), cv_data), port=0)
    threading.Thread(target=httpd.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{httpd.server_port}/"
    try:
        post = urllib.request.Request(
            base, data=question("Hi?").encode(), headers={"Content-Type": "application/json"}
        )
        status, headers, body = fetch(post)
        preflight_status, preflight_headers, _ = fetch(
            urllib.request.Request(base, method="OPTIONS")
        )
        cv_status, _, _ = fetch(base + "lebenslauf")
    finally:
        httpd.shutdown()
        httpd.server_close()

    assert status == 200
    assert json.loads(body).get("text") == "Hallo."
    assert headers.get("Access-Control-Allow-Origin") == "*"
    assert preflight_status == 204
    assert preflight_headers.get("Access-Control-Allow-Headers") == "content-type"
    assert cv_status == 200


@pytest.fixture
def sources(tmp_path: Path) -> list[str]:
    knowledge_base, cv_folder = write_sources(tmp_path)
    return ["--port", "0", "--wissensbasis", str(knowledge_base), "--lebenslauf", str(cv_folder)]


@pytest.fixture
def started() -> Iterator[list[HTTPServer]]:
    """Schließt die Server, die ein Test mit `start` öffnet."""
    servers: list[HTTPServer] = []
    yield servers
    for httpd in servers:
        httpd.server_close()


def test_start_warms_up_gemma_once_before_it_listens(
    monkeypatch: pytest.MonkeyPatch,
    server: FakeServer,
    sources: list[str],
    started: list[HTTPServer],
    capsys: pytest.CaptureFixture[str],
) -> None:
    monkeypatch.setitem(LM_STUDIO_HOSTS, "attrappe", LmStudioHost(server.base_url, "gemma"))
    server.body = reply_body(KNOWLEDGE)

    started.append(start(["--ziel", "attrappe", *sources]))

    assert len(server.requests) == 2  # Türsteher und Antwort, beide für die Aufwärmfrage
    assert WARM_UP_QUESTION in json.dumps(server.requests[0]["body"], ensure_ascii=False)
    assert "Bereit: http://127.0.0.1:" in capsys.readouterr().out


def test_start_warns_when_gemma_does_not_answer(
    monkeypatch: pytest.MonkeyPatch,
    sources: list[str],
    started: list[HTTPServer],
    capsys: pytest.CaptureFixture[str],
) -> None:
    # Port 1: Dort lauscht nichts, die Verbindung wird sofort abgelehnt.
    monkeypatch.setitem(LM_STUDIO_HOSTS, "aus", LmStudioHost("http://127.0.0.1:1/v1", "gemma"))

    started.append(start(["--ziel", "aus", *sources]))

    assert "antwortet nicht" in capsys.readouterr().out


def test_called_as_a_module_an_unknown_target_ends_with_exit_code_2() -> None:
    result = subprocess.run(
        [sys.executable, "-m", "testsammlung.local_backend", "--ziel", "unbekannt"],
        cwd=BACKEND,
        env={**os.environ, "PYTHONPATH": f"{BACKEND / 'src'}:{BACKEND}"},
        capture_output=True,
        text=True,
        timeout=60,
        check=False,
    )

    assert result.returncode == 2
    assert "unbekannt" in result.stderr
