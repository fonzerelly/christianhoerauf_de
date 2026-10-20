import json
import urllib.error
import urllib.request
from collections.abc import Callable, Sequence

from bot.ports.language_model import LanguageModelError, Message


class OpenAiCompatibleModel:
    """Sprachmodell über die OpenAI-kompatible Chat-Completions-Schnittstelle (ADR 0001).

    Gleicher Code für Bedrock (`bedrock-mantle`) und LM Studio; verschieden sind nur Adresse,
    Modellname und `token_provider`. Bewusst nur mit der Standardbibliothek: das `openai`-Paket
    wäre ein weiteres Paket im Lambda für einen einzigen POST.
    """

    def __init__(
        self,
        base_url: str,
        model: str,
        token_provider: Callable[[], str] | None,
        reasoning_effort: str = "none",
        timeout_seconds: float = 10.0,
    ) -> None:
        self._url = base_url.rstrip("/") + "/chat/completions"
        self._model = model
        self._token_provider = token_provider
        self._reasoning_effort = reasoning_effort
        self._timeout_seconds = timeout_seconds

    def complete(self, messages: Sequence[Message]) -> str:
        """Schickt die Nachrichten ans Modell und gibt den Text der ersten Antwort zurück."""
        request = urllib.request.Request(
            self._url,
            data=self._request_body(messages),
            headers=self._headers(),
            method="POST",
        )
        return self._read_text(self._send(request))

    def _request_body(self, messages: Sequence[Message]) -> bytes:
        body = {
            "model": self._model,
            "messages": list(messages),
            "reasoning_effort": self._reasoning_effort,
        }
        return json.dumps(body).encode()

    def _headers(self) -> dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self._token_provider is not None:
            headers["Authorization"] = f"Bearer {self._token_provider()}"
        return headers

    def _send(self, request: urllib.request.Request) -> bytes:
        """Sendet die Anfrage. Fehlermeldungen enthalten nie Header, also nie den Schlüssel."""
        try:
            with urllib.request.urlopen(request, timeout=self._timeout_seconds) as response:
                return bytes(response.read())
        except urllib.error.HTTPError as error:
            raise LanguageModelError(f"Das Modell antwortete mit HTTP {error.code}") from error
        except (TimeoutError, urllib.error.URLError) as error:
            # Ein Zeitlimit beim Verbinden kommt als URLError mit Grund TimeoutError an.
            timed_out = isinstance(error, TimeoutError) or isinstance(
                getattr(error, "reason", None), TimeoutError
            )
            message = (
                "Zeitlimit für den Modellaufruf überschritten"
                if timed_out
                else "Das Modell ist nicht erreichbar"
            )
            raise LanguageModelError(message) from error

    @staticmethod
    def _read_text(raw: bytes) -> str:
        try:
            content = json.loads(raw)["choices"][0]["message"]["content"]
        except (ValueError, KeyError, IndexError, TypeError) as error:
            raise LanguageModelError("Unbrauchbare Antwort des Modells") from error
        if not isinstance(content, str):
            raise LanguageModelError("Unbrauchbare Antwort des Modells")
        return content.strip()
