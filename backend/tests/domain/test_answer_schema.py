import json
from pathlib import Path

import pytest
from hypothesis import given
from hypothesis import strategies as st
from jsonschema import Draft202012Validator, ValidationError

from bot.domain.answer import Answer

SCHEMA_PATH = Path(__file__).parents[2] / "schema" / "answer.schema.json"
VALIDATOR = Draft202012Validator(json.loads(SCHEMA_PATH.read_text(encoding="utf-8")))


def test_answer_with_text_only_satisfies_schema() -> None:
    VALIDATOR.validate(Answer(text="Canberra.").to_dict())


def test_answer_with_gimmick_satisfies_schema() -> None:
    gimmick: dict[str, object] = {"type": "weather", "temperature": 14}

    VALIDATOR.validate(Answer(text="14 Grad.", gimmick=gimmick).to_dict())


@given(text=st.text(min_size=1))
def test_every_answer_with_text_satisfies_schema(text: str) -> None:
    VALIDATOR.validate(Answer(text=text).to_dict())


@pytest.mark.parametrize(
    "broken",
    [
        {},
        {"text": ""},
        {"text": 5},
        {"text": "x", "gimmick": {"temperature": 14}},
        {"text": "x", "unknown": 1},
    ],
)
def test_schema_rejects_broken_answers(broken: dict[str, object]) -> None:
    with pytest.raises(ValidationError):
        VALIDATOR.validate(broken)
