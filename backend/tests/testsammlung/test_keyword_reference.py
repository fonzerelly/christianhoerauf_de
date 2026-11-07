from pathlib import Path

import pytest

from testsammlung.keyword_reference import Rating, load_reference_keywords, rate_keyword

SOLLWERTE = """# Kopfkommentar
- {frage: "Was machte Chris bei Musterbau?", soll: ["Musterbau Highlights", "Lager"]}
- {frage: "Kann Chris Cobol?", soll: keins}
- {frage: "Erzähl was Lustiges.", soll: frei}
"""


def write(tmp_path: Path, text: str) -> Path:
    path = tmp_path / "sollwerte.yaml"
    path.write_text(text, encoding="utf-8")
    return path


def test_load_reference_keywords_reads_lists_and_the_words_keins_and_frei(tmp_path: Path) -> None:
    assert load_reference_keywords(write(tmp_path, SOLLWERTE)) == {
        "Was machte Chris bei Musterbau?": ("Musterbau Highlights", "Lager"),
        "Kann Chris Cobol?": "keins",
        "Erzähl was Lustiges.": "frei",
    }


def test_a_reference_the_bot_would_drop_is_refused(tmp_path: Path) -> None:
    text = '- {frage: "Was machte Chris?", soll: ["Chris Highlights"]}\n'

    with pytest.raises(ValueError, match="Chris Highlights"):
        load_reference_keywords(write(tmp_path, text))


class FakeKev:
    def __init__(self, probability: float) -> None:
        self.probability = probability
        self.calls: list[tuple[str, str, str, str]] = []

    def prefers(self, question: str, answer: str, mine: str, reference: str) -> float:
        self.calls.append((question, answer, mine, reference))
        return self.probability


EXPECTED = ("Musterbau Highlights", "Lager")


@pytest.mark.parametrize(
    ("keyword", "expected", "rating"),
    [
        ("musterbau-highlights", EXPECTED, Rating(1.0, "Treffer")),
        ("Lager", EXPECTED, Rating(1.0, "Treffer")),
        (None, EXPECTED, Rating(0.0, "kein gültiges Stichwort")),
        (None, "keins", Rating(1.0, "keins")),
        ("Cobol", "keins", Rating(0.0, "Stichwort trotz fester Antwort")),
        ("Cobol", "frei", Rating(None, "frei")),
    ],
)
def test_rate_keyword_without_kev(
    keyword: str | None, expected: tuple[str, ...] | str, rating: Rating
) -> None:
    kev = FakeKev(0.9)

    assert rate_keyword("Frage?", "Antwort.", keyword, expected, kev) == rating
    assert kev.calls == []


def test_rate_keyword_asks_kev_against_the_first_reference_otherwise() -> None:
    kev = FakeKev(0.62)

    rating = rate_keyword("Frage?", "Antwort.", "Java", EXPECTED, kev)

    assert rating == Rating(0.62, "Kev 0.62 gegen „Musterbau Highlights“")
    assert kev.calls == [("Frage?", "Antwort.", "Java", "Musterbau Highlights")]
