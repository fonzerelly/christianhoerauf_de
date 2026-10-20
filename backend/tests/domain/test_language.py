import pytest

from bot.domain.language import guess_language


@pytest.mark.parametrize(
    ("question", "expected"),
    [
        ("Was ist die Hauptstadt von Australien?", "de"),
        ("Wie viele Einwohner hat München?", "de"),
        ("What is the capital of Australia?", "en"),
        ("Who wrote the book and when was it published?", "en"),
        ("", "de"),
        ("42", "de"),
    ],
)
def test_guess_language(question: str, expected: str) -> None:
    assert guess_language(question) == expected
