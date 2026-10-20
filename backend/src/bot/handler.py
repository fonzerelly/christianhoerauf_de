"""Einstieg des Lambdas. Hier wird alles zusammengesteckt (Plan, Schritt 5).

Vertrag mit dem Frontend: `POST` mit JSON `{"question": "..."}`. Antwort `200` mit
`{"text": ..., "gimmick"?: ...}`; ungültige Anfrage `400` mit `{"text": <feste Antwort>}`.
Schemas: `schema/request.schema.json` und `schema/answer.schema.json`.
"""

import base64
import binascii
import json
import logging
import os
import time
from collections.abc import Mapping
from typing import Any

import boto3

from bot.adapters.bedrock_token import (
    BEDROCK_BASE_URL,
    BEDROCK_MODEL,
    BEDROCK_REGION,
    bedrock_token_provider,
)
from bot.adapters.dynamodb_store import DynamoDbStore
from bot.adapters.json_log import JsonLog
from bot.adapters.openai_compatible import OpenAiCompatibleModel
from bot.adapters.system_clock import SystemClock
from bot.domain.answer import Answer
from bot.domain.fixed_answers import FixedAnswerKind, fixed_answer
from bot.domain.language import guess_language
from bot.pipeline.bot import Bot
from bot.pipeline.general_answerer import GeneralAnswerer
from bot.pipeline.intent_classifier import IntentClassifier
from bot.pipeline.prompts import load_prompt

MAX_QUESTION_LENGTH = 500
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


def build_bot(environ: Mapping[str, str]) -> Bot:
    """Steckt den Bot aus der Umgebung des Lambdas zusammen. Fehlt `TABLE_NAME` oder
    `VISITOR_SECRET`, bricht das mit `KeyError` ab. Optional: `LLM_BASE_URL`, `LLM_MODEL`,
    `LLM_TIMEOUT_SECONDS` und `LLM_AUTH=none` (kein Schlüssel, etwa für LM Studio)."""
    table = environ["TABLE_NAME"]
    secret = environ["VISITOR_SECRET"]
    region = environ.get("AWS_REGION", BEDROCK_REGION)
    token_provider = None if environ.get("LLM_AUTH") == "none" else bedrock_token_provider(region)

    def make_model() -> OpenAiCompatibleModel:
        # Eine Instanz je Schritt, damit sich die Denkphase je Schritt einstellen lässt.
        return OpenAiCompatibleModel(
            base_url=environ.get("LLM_BASE_URL", BEDROCK_BASE_URL),
            model=environ.get("LLM_MODEL", BEDROCK_MODEL),
            token_provider=token_provider,
            timeout_seconds=float(environ.get("LLM_TIMEOUT_SECONDS", "10")),
        )

    clock = SystemClock()
    return Bot(
        IntentClassifier(make_model(), load_prompt("intent")),
        GeneralAnswerer(make_model(), load_prompt("general_answer")),
        DynamoDbStore(
            boto3.client("dynamodb", region_name=region),
            table,
            _STORE_TTL_SECONDS,
            now=time.time,
        ),
        clock,
        JsonLog(),
        secret,
    )


_bot: Bot | None = None


def handler(event: dict[str, Any], context: object) -> dict[str, object]:
    """Einstieg für AWS Lambda. Baut den Bot beim ersten Aufruf und behält ihn für weitere."""
    global _bot  # Lambda behält Modulzustand zwischen Aufrufen (warmer Start)
    if _bot is None:
        _bot = build_bot(os.environ)
    return handle(event, _bot)
