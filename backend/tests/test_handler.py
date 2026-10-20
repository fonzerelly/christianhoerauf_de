import base64
import json
from pathlib import Path
from typing import Any

import pytest
from jsonschema import Draft202012Validator

from bot.adapters.memory_store import MemoryStore
from bot.handler import build_bot, handle
from bot.pipeline.bot import Bot
from bot.pipeline.general_answerer import GeneralAnswerer
from bot.pipeline.intent_classifier import IntentClassifier
from bot.ports.language_model import LanguageModelError
from tests.fakes import FakeClock, FakeLanguageModel, ListLog

SCHEMAS = Path(__file__).parents[1] / "schema"
ANSWER_SCHEMA = Draft202012Validator(json.loads((SCHEMAS / "answer.schema.json").read_text()))
REQUEST_SCHEMA = Draft202012Validator(json.loads((SCHEMAS / "request.schema.json").read_text()))
IP = "203.0.113.7"


def make_bot(intents: list[str | Exception], answers: list[str | Exception] | None = None) -> Bot:
    return Bot(
        IntentClassifier(FakeLanguageModel(intents), "P"),
        GeneralAnswerer(FakeLanguageModel(answers or []), "P"),
        MemoryStore(),
        FakeClock(),
        ListLog(),
        "geheim",
    )


def event(body: object, method: str = "POST", base64_encoded: bool = False) -> dict[str, Any]:
    raw = body if isinstance(body, str) else json.dumps(body)
    return {
        "body": base64.b64encode(raw.encode()).decode() if base64_encoded else raw,
        "isBase64Encoded": base64_encoded,
        "requestContext": {"http": {"method": method, "sourceIp": IP}},
    }


def body_of(response: dict[str, object]) -> dict[str, object]:
    parsed = json.loads(str(response["body"]))
    assert isinstance(parsed, dict)
    ANSWER_SCHEMA.validate(parsed)  # jede Antwort genügt dem Vertrag
    return parsed


def test_valid_question_gets_200_and_the_answer_as_json() -> None:
    response = handle(
        event({"question": "Hauptstadt von Australien?"}), make_bot(["general"], ["Canberra."])
    )

    assert response["statusCode"] == 200
    assert response["headers"] == {"Content-Type": "application/json; charset=utf-8"}
    assert body_of(response) == {"text": "Canberra."}


def test_base64_encoded_body_is_decoded() -> None:
    response = handle(
        event({"question": "Größe?"}, base64_encoded=True), make_bot(["general"], ["Groß."])
    )

    assert body_of(response) == {"text": "Groß."}


@pytest.mark.parametrize(
    "body",
    [
        "kein json",
        "[1, 2]",
        {},
        {"question": ""},
        {"question": "   "},
        {"question": 5},
        {"question": "x" * 501},
    ],
)
def test_invalid_request_gets_400_with_a_fixed_answer(body: object) -> None:
    response = handle(event(body), make_bot([]))

    assert response["statusCode"] == 400
    assert (
        body_of(response)["text"]
        == "Das habe ich nicht verstanden. Stell mir bitte eine kurze Frage."
    )


def test_missing_body_and_wrong_method_get_400() -> None:
    assert (
        handle({"requestContext": {"http": {"method": "POST"}}}, make_bot([]))["statusCode"] == 400
    )
    assert handle(event({"question": "Frage?"}, method="GET"), make_bot([]))["statusCode"] == 400


def test_invalid_utf8_in_base64_body_gets_400() -> None:
    broken = {"body": base64.b64encode(b"\xff\xfe").decode(), "isBase64Encoded": True}

    assert handle(broken, make_bot([]))["statusCode"] == 400


@pytest.mark.parametrize("body", [{"question": "x" * 500}, {"question": "Hä?"}])
def test_requests_accepted_by_the_handler_match_the_request_schema(body: dict[str, str]) -> None:
    REQUEST_SCHEMA.validate(body)
    assert handle(event(body), make_bot(["general"], ["Ok."]))["statusCode"] == 200


@pytest.mark.parametrize("body", [{}, {"question": " "}, {"question": 5}, {"question": "x" * 501}])
def test_requests_rejected_by_the_handler_violate_the_request_schema(body: object) -> None:
    assert not REQUEST_SCHEMA.is_valid(body)
    assert handle(event(body), make_bot([]))["statusCode"] == 400


def test_missing_source_ip_still_works() -> None:
    raw = {
        "body": json.dumps({"question": "Frage?"}),
        "requestContext": {"http": {"method": "POST"}},
    }

    assert handle(raw, make_bot(["general"], ["Ok."]))["statusCode"] == 200


def test_model_failure_is_still_a_200_with_the_fixed_answer() -> None:
    response = handle(event({"question": "Frage?"}), make_bot([LanguageModelError("kaputt")]))

    assert response["statusCode"] == 200
    assert body_of(response)["text"].startswith("Ich bin gerade nicht erreichbar")  # type: ignore[attr-defined]


def test_unexpected_error_is_still_a_200_with_the_fixed_answer(
    caplog: pytest.LogCaptureFixture,
) -> None:
    bot = make_bot([RuntimeError("Tabelle weg")])

    response = handle(event({"question": "Frage?"}), bot)

    assert response["statusCode"] == 200
    assert body_of(response)["text"].startswith("Ich bin gerade nicht erreichbar")  # type: ignore[attr-defined]
    assert "Tabelle weg" in caplog.text


def test_build_bot_needs_the_secret_and_the_table(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AWS_DEFAULT_REGION", "eu-central-1")

    with pytest.raises(KeyError):
        build_bot({"TABLE_NAME": "bot"})
    with pytest.raises(KeyError):
        build_bot({"VISITOR_SECRET": "geheim"})


def test_build_bot_assembles_a_bot_from_the_environment(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("AWS_DEFAULT_REGION", "eu-central-1")
    environ = {"TABLE_NAME": "bot", "VISITOR_SECRET": "geheim", "LLM_TIMEOUT_SECONDS": "5"}

    assert isinstance(build_bot(environ), Bot)
    assert isinstance(build_bot({**environ, "LLM_AUTH": "none"}), Bot)


def test_handler_builds_the_bot_once_and_reuses_it(monkeypatch: pytest.MonkeyPatch) -> None:
    import bot.handler as module

    builds: list[int] = []

    def fake_build_bot(environ: object) -> Bot:
        builds.append(1)
        return make_bot(["general", "general"], ["Eins.", "Zwei."])

    monkeypatch.setattr(module, "_bot", None)
    monkeypatch.setattr(module, "build_bot", fake_build_bot)

    first = module.handler(event({"question": "A?"}), None)
    second = module.handler(event({"question": "B?"}), None)

    assert (body_of(first)["text"], body_of(second)["text"]) == ("Eins.", "Zwei.")
    assert builds == [1]
