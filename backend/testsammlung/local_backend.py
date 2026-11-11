"""Lokales Backend für den Vite-Entwicklungsserver (`npm run dev` im Frontend).

Derselbe Bot wie im Lambda (`assemble_bot`, `handle`, `handle_cv`), aber ohne AWS: Gemma in
LM Studio auf dem Mac mini oder der DGX, Zähler und Zwischenspeicher im Arbeitsspeicher (ein
Neustart leert sie), das Protokoll als JSON-Zeilen im Terminal.

Aufruf: python -m testsammlung.local_backend [--ziel macmini|dgx] [--port 8787]
"""

import argparse
import itertools
import sys
import time
from collections.abc import Mapping, Sequence
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import parse_qsl, urlsplit

from bot.adapters.json_log import JsonLog
from bot.adapters.memory_store import MemoryStore
from bot.domain.fixed_answers import FixedAnswerKind, fixed_answer
from bot.domain.public_cv import CvData
from bot.handler import assemble_bot, handle, handle_cv, is_cv_request, load_cv_data
from bot.pipeline.bot import Bot
from testsammlung.targets import DEFAULT_TARGET, LM_STUDIO_HOSTS

DEFAULT_PORT = 8787
# Im Lambda 10 s. LM Studio braucht für den langen Prompt mit Wissensbasis beim ersten Mal länger.
LOCAL_TIMEOUT_SECONDS = 120
# Eine Frage zum Werdegang: Sie lädt den langen Prompt mit der Wissensbasis in den Zwischenspeicher
# von LM Studio, damit schon die erste echte Frage innerhalb der 15 s des Frontends ankommt.
WARM_UP_QUESTION = "Was hat Chris studiert?"
BACKEND = Path(__file__).resolve().parents[1]
# Der Vite-Server läuft auf einer anderen Herkunft (localhost:5173) und schickt die Fragen per POST.
CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
}


def local_environ(target: str, knowledge_base: Path, cv_folder: Path) -> dict[str, str]:
    """Die Umgebung, mit der `assemble_bot` und `load_cv_data` Gemma auf `target` (Name aus
    `LM_STUDIO_HOSTS`) und die Ordner der Wissensbasis und von `varianten.yaml` nehmen."""
    host = LM_STUDIO_HOSTS[target]
    return {
        "VISITOR_SECRET": "lokal",
        "LLM_BASE_URL": host.url,
        "LLM_MODEL": host.model,
        "LLM_AUTH": "none",
        "LLM_TIMEOUT_SECONDS": str(LOCAL_TIMEOUT_SECONDS),
        "WISSENSBASIS_DIR": str(knowledge_base),
        "LEBENSLAUF_DIR": str(cv_folder),
    }


class LocalBackend:
    """Beantwortet Anfragen wie das Lambda: `GET /lebenslauf` mit `handle_cv`, alles andere mit
    `handle` und dem Bot."""

    def __init__(self, bot: Bot, cv_data: CvData) -> None:
        self._bot = bot
        self._cv_data = cv_data
        self._request_numbers = itertools.count(1)

    def respond(self, method: str, path: str, body: str | None) -> dict[str, object]:
        """Baut aus der Anfrage ein Ereignis wie das einer Lambda Function URL und gibt die
        Antwort im Lambda-Format zurück (`statusCode`, `headers`, `body`).

        Jede Anfrage bekommt eine eigene Absenderadresse `lokal-<Nummer>`: Lokal kommen alle
        Fragen von 127.0.0.1, die Besuchergrenze (10 am Tag) würde sonst schnell greifen."""
        url = urlsplit(path)
        event: dict[str, Any] = {
            "rawPath": url.path,
            "queryStringParameters": dict(parse_qsl(url.query)),
            "body": body,
            "isBase64Encoded": False,
            "requestContext": {
                "http": {"method": method, "sourceIp": f"lokal-{next(self._request_numbers)}"}
            },
        }
        if is_cv_request(event):
            return handle_cv(event, self._cv_data)
        return handle(event, self._bot)


def make_server(backend: LocalBackend, port: int) -> HTTPServer:
    """Ein HTTP-Server auf 127.0.0.1:`port` (0: ein freier Port) vor `backend`, mit den
    CORS-Kopfzeilen für den Vite-Server. Er arbeitet eine Anfrage nach der anderen ab: LM Studio
    verliert bei parallelen Anfragen den Zwischenspeicher des langen Prompts."""

    class Handler(BaseHTTPRequestHandler):
        def do_GET(self) -> None:
            self._answer(backend.respond("GET", self.path, None))

        def do_POST(self) -> None:
            length = int(self.headers.get("Content-Length", "0"))
            body = self.rfile.read(length).decode("utf-8", errors="replace")
            self._answer(backend.respond("POST", self.path, body))

        def do_OPTIONS(self) -> None:
            # Vorabanfrage des Browsers vor dem POST mit JSON.
            self._send(204, {}, b"")

        def _answer(self, response: Mapping[str, object]) -> None:
            headers = response["headers"]
            assert isinstance(headers, Mapping)
            self._send(int(str(response["statusCode"])), headers, str(response["body"]).encode())

        def _send(self, status: int, headers: Mapping[str, str], payload: bytes) -> None:
            self.send_response(status)
            for name, value in {**headers, **CORS_HEADERS}.items():
                self.send_header(name, value)
            self.send_header("Content-Length", str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)

        def log_message(self, format: str, *args: object) -> None:
            pass  # Der Bot schreibt sein eigenes Protokoll.

    return HTTPServer(("127.0.0.1", port), Handler)


def start(argv: Sequence[str]) -> HTTPServer:
    """Liest die Argumente, baut Bot und Lebenslauf, stellt die Aufwärmfrage und gibt den Server
    zurück, der schon lauscht (aber noch nichts abarbeitet). Antwortet Gemma nicht, steht eine
    Warnung im Terminal; der Server startet trotzdem."""
    parser = argparse.ArgumentParser(description="Lokales Backend für npm run dev")
    parser.add_argument("--ziel", choices=list(LM_STUDIO_HOSTS), default=DEFAULT_TARGET)
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    parser.add_argument("--wissensbasis", type=Path, default=BACKEND / "wissensbasis")
    parser.add_argument("--lebenslauf", type=Path, default=BACKEND / "lebenslauf")
    args = parser.parse_args(argv)

    environ = local_environ(args.ziel, args.wissensbasis, args.lebenslauf)
    bot = assemble_bot(environ, MemoryStore(), JsonLog())
    cv_data = load_cv_data(environ)

    print(f"Lokales Backend: Gemma auf {args.ziel} ({environ['LLM_BASE_URL']}). Aufwärmfrage …")
    started = time.monotonic()
    answer = bot.ask(WARM_UP_QUESTION, "aufwärmen")
    if answer.text == fixed_answer(FixedAnswerKind.UNAVAILABLE, "de").text:
        print(f"Achtung: Gemma auf {args.ziel} antwortet nicht. Läuft LM Studio dort?")
    else:
        print(f"Aufgewärmt nach {time.monotonic() - started:.0f} s.")

    httpd = make_server(LocalBackend(bot, cv_data), args.port)
    print(f"Bereit: http://127.0.0.1:{httpd.server_port}/", flush=True)
    return httpd


# Am Dateiende, damit beim direkten Aufruf alle Funktionen schon definiert sind.
if __name__ == "__main__":  # pragma: no cover
    server = start(sys.argv[1:])
    try:
        server.serve_forever()
    except KeyboardInterrupt:  # Strg+C in npm run dev
        pass
    finally:
        server.server_close()
