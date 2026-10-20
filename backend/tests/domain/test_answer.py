from bot.domain.answer import Answer


def test_answer_without_gimmick_has_only_text() -> None:
    answer = Answer(text="Die Hauptstadt von Australien ist Canberra.")

    assert answer.to_dict() == {"text": "Die Hauptstadt von Australien ist Canberra."}


def test_answer_with_gimmick_carries_it_along() -> None:
    gimmick: dict[str, object] = {"type": "weather", "temperature": 14, "sky": "cloudy"}
    answer = Answer(text="In München 14 Grad, bewölkt.", gimmick=gimmick)

    assert answer.to_dict() == {"text": "In München 14 Grad, bewölkt.", "gimmick": gimmick}
