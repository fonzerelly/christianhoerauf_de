import json

from hypothesis import given
from hypothesis import strategies as st

from bot.domain.answer import Answer


@given(text=st.text())
def test_text_survives_json_round_trip(text: str) -> None:
    serialized = json.dumps(Answer(text=text).to_dict())

    assert json.loads(serialized) == {"text": text}


@given(
    text=st.text(min_size=1),
    keyword=st.none() | st.text(min_size=1),
    suggestions=st.lists(st.text(min_size=1), max_size=3).map(tuple),
)
def test_answer_survives_the_round_trip_through_its_dict(
    text: str, keyword: str | None, suggestions: tuple[str, ...]
) -> None:
    answer = Answer(text=text, keyword=keyword, suggestions=suggestions)

    assert Answer.from_dict(json.loads(json.dumps(answer.to_dict()))) == answer
