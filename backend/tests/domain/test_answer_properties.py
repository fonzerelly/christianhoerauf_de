import json

from hypothesis import given
from hypothesis import strategies as st

from bot.domain.answer import Answer


@given(text=st.text())
def test_text_survives_json_round_trip(text: str) -> None:
    serialized = json.dumps(Answer(text=text).to_dict())

    assert json.loads(serialized) == {"text": text}
