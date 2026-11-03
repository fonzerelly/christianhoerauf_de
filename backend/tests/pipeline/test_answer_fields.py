import pytest

from bot.pipeline.answer_fields import (
    AnswerFields,
    checked_answer_fields,
    is_fixed_text,
    keyword_problem,
    read_answer_fields,
    suggestion_problem,
)

REPLY = """[[ ## antwort ## ]]
Chris entwickelte bei der Musterbau GmbH eine Lagerverwaltung in Java.

[[ ## stichwort ## ]]
Lagerverwaltung

[[ ## folgefragen ## ]]
Warum setzte Chris bei der Musterbau GmbH auf Java?
- Was erlebte Chris bei der Musterbau GmbH mit dem Gabelstapler?

[[ ## completed ## ]]"""

ANSWER = "Chris entwickelte bei der Musterbau GmbH eine Lagerverwaltung in Java."


def test_read_answer_fields_reads_all_three_fields_and_drops_list_markers() -> None:
    assert read_answer_fields(REPLY) == AnswerFields(
        answer=ANSWER,
        keyword="Lagerverwaltung",
        suggestions=(
            "Warum setzte Chris bei der Musterbau GmbH auf Java?",
            "Was erlebte Chris bei der Musterbau GmbH mit dem Gabelstapler?",
        ),
    )


def test_without_any_marker_the_whole_reply_is_the_answer() -> None:
    assert read_answer_fields("  Darüber lerne ich gerade noch. ") == AnswerFields(
        "Darüber lerne ich gerade noch."
    )


def test_a_missing_field_is_left_out() -> None:
    reply = "[[ ## antwort ## ]]\nChris programmierte.\n\n[[ ## folgefragen ## ]]\nWas tat Chris?"

    assert read_answer_fields(reply) == AnswerFields(
        "Chris programmierte.", None, ("Was tat Chris?",)
    )


def test_an_empty_keyword_field_is_no_keyword() -> None:
    reply = "[[ ## antwort ## ]]\nChris programmierte.\n\n[[ ## stichwort ## ]]\n\n"

    assert read_answer_fields(reply).keyword is None


def test_fixed_texts_in_both_languages() -> None:
    assert is_fixed_text("Darüber lerne ich gerade noch.")
    assert is_fixed_text("I'm afraid I can't help you with that.")
    assert not is_fixed_text("Chris programmierte.")


@pytest.mark.parametrize(
    ("keyword", "problem"),
    [
        ("Lagerverwaltung", None),
        ("Java", None),
        ("Lager verwaltung", "mehr als ein Wort"),
        ("Gabelstapler", "steht nicht in der Antwort"),
        ("Lager", "steht nicht in der Antwort"),
        ("Musterbau-GmbH-Lagerverwaltungen", "länger als 20 Zeichen"),
        ("Chris", "ist „Chris“"),
        ("Java™", "nicht darstellbar"),
        ("Musterbau", None),  # Ein Wort aus der Frage ist erlaubt (K14 gestrichen, 03.11.).
    ],
)
def test_keyword_problem(keyword: str, problem: str | None) -> None:
    answer = (
        "Chris entwickelte bei der Musterbau GmbH eine Lagerverwaltung in Java™ mit Lager-Software."
    )

    assert keyword_problem(keyword, answer) == problem


EARLIER = ["Warum wählte Chris Java?"]


@pytest.mark.parametrize(
    ("suggestion", "problem"),
    [
        ("Wie testete Chris die Lagerverwaltung?", None),
        ("Wie testete Chris die Lagerverwaltung", "endet nicht mit „?“"),
        ("Wie testete er die Lagerverwaltung?", "nennt „Chris“ nicht"),
        ("Was baute ChrisBot?", "nennt „Chris“ nicht"),
        ("warum wählte chris java?", "doppelt"),
        ("Warum Chris " + "x" * 300 + "?", "länger als 300 Zeichen"),
    ],
)
def test_suggestion_problem(suggestion: str, problem: str | None) -> None:
    assert suggestion_problem(suggestion, EARLIER) == problem


def test_checked_answer_fields_drops_what_fails_and_keeps_at_most_three() -> None:
    fields = AnswerFields(
        ANSWER,
        "Gabelstapler",
        (
            "Warum wählte er Java?",
            "Warum setzte Chris auf Java?",
            "Was erlebte Chris mit dem Gabelstapler?",
            "Was lernte Chris bei der Musterbau GmbH?",
            "Wie testete Chris die Lagerverwaltung?",
        ),
    )

    checked = checked_answer_fields(fields)

    assert checked == AnswerFields(
        ANSWER,
        None,
        (
            "Warum setzte Chris auf Java?",
            "Was erlebte Chris mit dem Gabelstapler?",
            "Was lernte Chris bei der Musterbau GmbH?",
        ),
    )


def test_checked_answer_fields_drops_keyword_and_suggestions_of_a_fixed_text() -> None:
    fields = AnswerFields("Darüber lerne ich gerade noch.", "Rust", ("Kann Chris Rust?",))

    assert checked_answer_fields(fields) == AnswerFields("Darüber lerne ich gerade noch.")
