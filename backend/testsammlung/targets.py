"""Die Ziele für Messungen und Trainings: Rechner mit LM Studio im Heimnetz und Bedrock.

Einen weiteren Rechner ergänzt man in `LM_STUDIO_HOSTS`; danach steht er bei `--ziel` von
Messung, Training, Testsammlung und zweiter Sicherung zur Wahl.

Bedrock kostet je Aufruf Geld und ist deshalb nur für Messungen erlaubt, nie fürs Training.
"""

from dataclasses import dataclass

from bot.adapters.bedrock_token import BEDROCK_MODEL
from bot.adapters.openai_compatible import OpenAiCompatibleModel
from bot.handler import language_model


@dataclass(frozen=True)
class LmStudioHost:
    """Ein Rechner mit LM Studio: Adresse der OpenAI-kompatiblen Schnittstelle und Modellname."""

    url: str
    model: str


LM_STUDIO_HOSTS: dict[str, LmStudioHost] = {
    "macmini": LmStudioHost("http://192.168.178.91:1234/v1", "google/gemma-4-26b-a4b-qat"),
    "dgx": LmStudioHost("http://192.168.178.60:1235/v1", "google/gemma-4-26b-a4b-qat"),
}
BEDROCK = "bedrock"
DEFAULT_TARGET = "macmini"
MEASUREMENT_TARGETS = (*LM_STUDIO_HOSTS, BEDROCK)
TRAINING_TARGETS = tuple(LM_STUDIO_HOSTS)


def model_name(target: str) -> str:
    """Der Name des Modells, das auf dem Ziel antwortet."""
    if target == BEDROCK:
        return BEDROCK_MODEL
    return _host(target).model


def build_target_model(
    target: str,
    *,
    timeout_seconds: float,
    temperature: float | None = None,
    max_tokens: int | None = None,
) -> OpenAiCompatibleModel:
    """Baut das Modell mit derselben Funktion wie der Bot (`language_model` im Handler).

    Bei Bedrock nur mit eigenem Zeitlimit, sonst wie im Betrieb (Adresse, Modell, Schlüssel aus
    den AWS-Zugangsdaten der Umgebung). Bei einem Rechner mit LM Studio dessen Adresse und Modell,
    ohne Schlüssel. Unbekanntes Ziel: `ValueError`."""
    environ = {"LLM_TIMEOUT_SECONDS": str(timeout_seconds)}
    if target != BEDROCK:
        host = _host(target)
        environ |= {"LLM_BASE_URL": host.url, "LLM_MODEL": host.model, "LLM_AUTH": "none"}
    return language_model(environ, temperature, max_tokens)


def _host(target: str) -> LmStudioHost:
    if target not in LM_STUDIO_HOSTS:
        raise ValueError(f"Unbekanntes Ziel: {target}")
    return LM_STUDIO_HOSTS[target]
