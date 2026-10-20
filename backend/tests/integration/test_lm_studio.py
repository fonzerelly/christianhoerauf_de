"""Läuft nur mit `pytest -m integration --no-cov` und erreichbarem LM Studio auf dem Mac mini."""

import urllib.request

import pytest

from bot.adapters.openai_compatible import OpenAiCompatibleModel
from bot.domain.intent import Intent
from bot.pipeline.general_answerer import GeneralAnswerer
from bot.pipeline.intent_classifier import IntentClassifier
from bot.pipeline.prompts import load_prompt

LM_STUDIO_URL = "http://192.168.178.91:1234/v1"
LM_STUDIO_MODEL = "google/gemma-4-26b-a4b-qat"

pytestmark = pytest.mark.integration


@pytest.fixture
def model() -> OpenAiCompatibleModel:
    try:
        urllib.request.urlopen(f"{LM_STUDIO_URL}/models", timeout=3)  # noqa: S310
    except OSError:
        pytest.skip("LM Studio auf dem Mac mini ist nicht erreichbar")
    return OpenAiCompatibleModel(LM_STUDIO_URL, LM_STUDIO_MODEL, None, timeout_seconds=60)


def test_intent_of_a_general_question(model: OpenAiCompatibleModel) -> None:
    classifier = IntentClassifier(model, load_prompt("intent"))

    assert classifier.classify("Was ist die Hauptstadt von Australien?") == Intent.GENERAL


def test_general_answer_names_canberra(model: OpenAiCompatibleModel) -> None:
    answerer = GeneralAnswerer(model, load_prompt("general_answer"))

    assert "Canberra" in answerer.answer("Was ist die Hauptstadt von Australien?")
