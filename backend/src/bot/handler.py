"""Einstieg des Lambdas. Hier wird alles zusammengesteckt (Plan, Schritt 5).

Vertrag mit dem Frontend: `POST` mit JSON `{"question": "..."}`. Antwort `200` mit
`{"text": ..., "gimmick"?: ..., "keyword"?: ..., "suggestions"?: [...]}`; ungültige Anfrage `400`
mit `{"text": <feste Antwort>}`.
Schemas: `schema/request.schema.json` und `schema/answer.schema.json`.
"""

import base64
import binascii
import json
import logging
import os
import time
from collections.abc import Mapping
from pathlib import Path
from typing import Any

import boto3

from bot.adapters.bedrock_token import (
    BEDROCK_BASE_URL,
    BEDROCK_MODEL,
    BEDROCK_REGION,
    bedrock_token_provider,
)
from bot.adapters.cv_files import read_cv_data
from bot.adapters.dynamodb_store import DynamoDbStore
from bot.adapters.json_log import JsonLog
from bot.adapters.knowledge_files import knowledge_texts
from bot.adapters.openai_compatible import OpenAiCompatibleModel
from bot.adapters.system_clock import SystemClock
from bot.domain.answer import Answer
from bot.domain.cv_variant import variant_by_number
from bot.domain.fixed_answers import FixedAnswerKind, fixed_answer
from bot.domain.language import guess_language
from bot.domain.public_cv import CvData, public_cv
from bot.pipeline.bot import Bot
from bot.pipeline.general_answerer import GeneralAnswerer
from bot.pipeline.intent_classifier import GATE_MAX_TOKENS, GATE_TEMPERATURE, IntentClassifier
from bot.pipeline.prompts import knowledge_base_system_prompt, load_intent_program, load_prompt

MAX_QUESTION_LENGTH = 500
# Im Lambda-Paket liegt die Wissensbasis neben `bot/` (scripts/build_package.sh).
_PACKAGED_KNOWLEDGE_BASE = Path(__file__).resolve().parent.parent / "wissensbasis"
# Daneben `lebenslauf/varianten.yaml` für den Lebenslauf-Endpunkt.
_PACKAGED_CV_FOLDER = Path(__file__).resolve().parent.parent / "lebenslauf"
CV_PATH = "/lebenslauf"
# Der Lebenslauf ändert sich nur mit einem neuen Paket; Browser dürfen ihn kurz behalten.
CV_CACHE_CONTROL = "public, max-age=300"
_STORE_TTL_SECONDS = 2 * 24 * 60 * 60  # Zähler und Zwischenspeicher verfallen nach zwei Tagen


def _response(status: int, answer: Answer) -> dict[str, object]:
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json; charset=utf-8"},
        "body": json.dumps(answer.to_dict(), ensure_ascii=False),
    }


def _read_question(event: Mapping[str, Any]) -> str | None:
    """Die Frage aus der Anfrage, oder `None`, wenn die Anfrage ungültig ist."""
    if event.get("requestContext", {}).get("http", {}).get("method") != "POST":
        return None
    body = event.get("body")
    if not isinstance(body, str):
        return None
    try:
        text = (
            base64.b64decode(body, validate=True).decode() if event.get("isBase64Encoded") else body
        )
        question = json.loads(text).get("question")
    except ValueError, binascii.Error, AttributeError:
        return None
    if not isinstance(question, str) or not question.strip() or len(question) > MAX_QUESTION_LENGTH:
        return None
    return question


def handle(event: Mapping[str, Any], bot: Bot) -> dict[str, object]:
    """Liest die Anfrage, lässt den Bot antworten und verpackt das Ergebnis als HTTP-Antwort.
    Auch bei unerwarteten Fehlern kommt eine feste Antwort im Vertragsformat zurück."""
    question = _read_question(event)
    if question is None:
        return _response(400, fixed_answer(FixedAnswerKind.INVALID_REQUEST, "de"))
    ip = event.get("requestContext", {}).get("http", {}).get("sourceIp", "unknown")
    try:
        return _response(200, bot.ask(question, ip))
    except Exception:  # bewusst breit: der Besucher soll immer eine Antwort im Vertrag bekommen
        logging.exception("Unerwarteter Fehler bei der Antwort")
        unavailable = fixed_answer(FixedAnswerKind.UNAVAILABLE, guess_language(question))
        return _response(200, unavailable)


def language_model(
    environ: Mapping[str, str], temperature: float | None = None, max_tokens: int | None = None
) -> OpenAiCompatibleModel:
    """Ein Sprachmodell, wie der Bot es anspricht: ohne Variablen Gemma bei Bedrock in Frankfurt,
    signiert mit den AWS-Zugangsdaten der Umgebung. `LLM_BASE_URL`, `LLM_MODEL`,
    `LLM_TIMEOUT_SECONDS` (10) und `LLM_AUTH=none` (kein Schlüssel, etwa für LM Studio) ändern
    das. Auch die Messungen in `testsammlung/` bauen ihre Modelle hiermit."""
    region = environ.get("AWS_REGION", BEDROCK_REGION)
    token_provider = None if environ.get("LLM_AUTH") == "none" else bedrock_token_provider(region)
    return OpenAiCompatibleModel(
        base_url=environ.get("LLM_BASE_URL", BEDROCK_BASE_URL),
        model=environ.get("LLM_MODEL", BEDROCK_MODEL),
        token_provider=token_provider,
        timeout_seconds=float(environ.get("LLM_TIMEOUT_SECONDS", "10")),
        temperature=temperature,
        max_tokens=max_tokens,
    )


def build_bot(environ: Mapping[str, str]) -> Bot:
    """Steckt den Bot aus der Umgebung des Lambdas zusammen. Fehlt `TABLE_NAME` oder
    `VISITOR_SECRET`, bricht das mit `KeyError` ab. Optional: `LLM_BASE_URL`, `LLM_MODEL`,
    `LLM_TIMEOUT_SECONDS`, `LLM_AUTH=none` (kein Schlüssel, etwa für LM Studio) und
    `WISSENSBASIS_DIR` (Ordner der Wissensbasis, sonst der im Paket)."""
    table = environ["TABLE_NAME"]
    secret = environ["VISITOR_SECRET"]
    region = environ.get("AWS_REGION", BEDROCK_REGION)

    def make_model(
        temperature: float | None = None, max_tokens: int | None = None
    ) -> OpenAiCompatibleModel:
        # Eine Instanz je Schritt, damit sich Denkphase und Einstellungen je Schritt setzen lassen.
        return language_model(environ, temperature, max_tokens)

    knowledge = knowledge_texts(Path(environ.get("WISSENSBASIS_DIR", _PACKAGED_KNOWLEDGE_BASE)))
    clock = SystemClock()
    knowledge_answerer = (
        GeneralAnswerer(
            make_model(),
            knowledge_base_system_prompt(
                load_prompt("knowledge_base_answer_fields"),
                knowledge,
                load_prompt("knowledge_base_answer_fields_end"),
            ),
        )
        if knowledge
        else None
    )
    return Bot(
        IntentClassifier(
            make_model(temperature=GATE_TEMPERATURE, max_tokens=GATE_MAX_TOKENS),
            load_intent_program(),
        ),
        GeneralAnswerer(make_model(), load_prompt("general_answer"), clock=clock),
        GeneralAnswerer(make_model(), load_prompt("task_answer")),
        DynamoDbStore(
            boto3.client("dynamodb", region_name=region),
            table,
            _STORE_TTL_SECONDS,
            now=time.time,
        ),
        clock,
        JsonLog(),
        secret,
        cache_version=cache_version(environ),
        knowledge_answerer=knowledge_answerer,
    )


def cache_version(environ: Mapping[str, str]) -> str:
    """Kennung des Ausrollens für den Zwischenspeicher: `BUILD_ID` (Prüfsumme des Pakets, setzt
    OpenTofu), lokal ohne die Variable „lokal“."""
    return environ.get("BUILD_ID", "lokal")


def _json_response(status: int, body: object, headers: Mapping[str, str]) -> dict[str, object]:
    return {
        "statusCode": status,
        "headers": {"Content-Type": "application/json; charset=utf-8", **headers},
        "body": json.dumps(body, ensure_ascii=False),
    }


def _is_cv_request(event: Mapping[str, Any]) -> bool:
    method = event.get("requestContext", {}).get("http", {}).get("method")
    return method == "GET" and event.get("rawPath") == CV_PATH


def handle_cv(event: Mapping[str, Any], cv_data: CvData) -> dict[str, object]:
    """Der öffentliche Lebenslauf der Variante aus `?variante=<Nummer>` als JSON
    (schema/lebenslauf.schema.json). Ohne, mit unbekannter oder kaputter Nummer: der ganze."""
    parameters = event.get("queryStringParameters") or {}
    number = str(parameters.get("variante", ""))
    variant = variant_by_number(cv_data.variants, int(number)) if number.isdigit() else None
    body = public_cv(cv_data.stations, cv_data.projects, cv_data.listed, variant)
    return _json_response(200, body, {"Cache-Control": CV_CACHE_CONTROL})


def load_cv_data(environ: Mapping[str, str]) -> CvData:
    """Liest Wissensbasis (`WISSENSBASIS_DIR`) und `varianten.yaml` (im Ordner `LEBENSLAUF_DIR`);
    ohne die Variablen die Ordner im Lambda-Paket."""
    knowledge_base = Path(environ.get("WISSENSBASIS_DIR", _PACKAGED_KNOWLEDGE_BASE))
    cv_folder = Path(environ.get("LEBENSLAUF_DIR", _PACKAGED_CV_FOLDER))
    return read_cv_data(knowledge_base, cv_folder / "varianten.yaml")


def _serve_cv(event: Mapping[str, Any]) -> dict[str, object]:
    """Liest die Daten beim ersten Aufruf und behält sie. Sind sie kaputt: 503, und der nächste
    Aufruf versucht es neu (der Bot ist davon nicht betroffen)."""
    global _cv_data  # wie _bot: Lambda behält Modulzustand zwischen Aufrufen
    if _cv_data is None:
        try:
            _cv_data = load_cv_data(os.environ)
        except Exception:  # bewusst breit: kaputte Daten dürfen nur den Lebenslauf treffen
            logging.exception("Lebenslauf nicht lesbar")
            return _json_response(503, {"fehler": "Lebenslauf gerade nicht verfügbar"}, {})
    return handle_cv(event, _cv_data)


_bot: Bot | None = None
_cv_data: CvData | None = None


def handler(event: dict[str, Any], context: object) -> dict[str, object]:
    """Einstieg für AWS Lambda. `GET /lebenslauf` liefert den Lebenslauf, ohne den Bot zu bauen;
    alles andere geht an den Bot, der beim ersten Aufruf gebaut und behalten wird."""
    if _is_cv_request(event):
        return _serve_cv(event)
    global _bot  # Lambda behält Modulzustand zwischen Aufrufen (warmer Start)
    if _bot is None:
        _bot = build_bot(os.environ)
    return handle(event, _bot)
