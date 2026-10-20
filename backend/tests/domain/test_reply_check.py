from hypothesis import given
from hypothesis import strategies as st

from bot.domain.reply_check import MAX_LENGTH, check_reply


def test_short_reply_stays_as_it_is() -> None:
    assert check_reply("Canberra ist die Hauptstadt.") == "Canberra ist die Hauptstadt."


def test_emojis_are_removed() -> None:
    assert check_reply("Super 😀 gemacht 👍🏽!") == "Super gemacht !"


def test_whitespace_is_tidied() -> None:
    assert check_reply("  Hallo \n  Welt  ") == "Hallo Welt"


def test_umlauts_and_sharp_s_stay() -> None:
    assert check_reply("Größe ändern: ä ö ü ß €") == "Größe ändern: ä ö ü ß €"


def test_long_reply_is_cut_at_the_last_sentence_end() -> None:
    first = "Das ist der erste Satz. "
    second = "Hier kommt der zweite Satz mit ein paar Wörtern mehr. "
    third = "Und der dritte Satz ist so lang, dass er nicht mehr in die Grenze von zweihundert "
    long_text = (
        first
        + second
        + third
        + "Zeichen passt und deshalb wegfallen muss, auch wenn er schön formuliert ist."
    )

    assert check_reply(long_text) == (first + second).strip()


def test_long_reply_without_sentence_end_is_cut_at_a_word() -> None:
    text = "wort " * 100

    result = check_reply(text)

    assert len(result) <= MAX_LENGTH
    assert result.endswith("wort.")


def test_long_reply_without_any_space_is_cut_hard() -> None:
    result = check_reply("x" * 500)

    assert result == "x" * MAX_LENGTH


@given(text=st.text())
def test_result_is_never_longer_than_the_limit(text: str) -> None:
    assert len(check_reply(text)) <= MAX_LENGTH
