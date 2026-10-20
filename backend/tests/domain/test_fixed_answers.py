import pytest

from bot.domain.fixed_answers import FixedAnswerKind, fixed_answer


def test_about_christian_answer_in_german() -> None:
    assert fixed_answer(FixedAnswerKind.ABOUT_CHRISTIAN, "de").text == (
        "Darüber lerne ich gerade noch."
    )


def test_unavailable_answer_in_german() -> None:
    assert fixed_answer(FixedAnswerKind.UNAVAILABLE, "de").text == (
        "Ich bin gerade nicht erreichbar. Versuch es gleich noch einmal."
    )


def test_english_differs_from_german_for_every_kind() -> None:
    for kind in FixedAnswerKind:
        german = fixed_answer(kind, "de").text
        english = fixed_answer(kind, "en").text

        assert german != english


@pytest.mark.parametrize("language", ["de", "en"])
def test_every_fixed_answer_is_short_and_has_no_gimmick(language: str) -> None:
    for kind in FixedAnswerKind:
        answer = fixed_answer(kind, language)  # type: ignore[arg-type]

        assert 0 < len(answer.text) <= 200
        assert answer.gimmick is None
