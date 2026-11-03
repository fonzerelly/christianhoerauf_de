from pathlib import Path

import pytest

from testsammlung.answer_questions import AnswerQuestion, load_answer_questions


def test_load_answer_questions_reads_text_language_kind_and_part(tmp_path: Path) -> None:
    file = tmp_path / "fragen.yaml"
    file.write_text(
        '- {frage: "Was macht Chris?"}\n'
        '- {frage: "Should we hire Chris?", sprache: en, art: urteil, teil: pruefen}\n',
        "utf-8",
    )

    assert load_answer_questions(file) == [
        AnswerQuestion("Was macht Chris?", "de", "normal", "lernen"),
        AnswerQuestion("Should we hire Chris?", "en", "urteil", "pruefen"),
    ]


@pytest.mark.parametrize(
    "entry",
    [
        '{frage: "x", sprache: fr}',
        '{frage: "x", art: witz}',
        '{frage: "x", teil: test}',
    ],
)
def test_an_unknown_language_kind_or_part_is_rejected(tmp_path: Path, entry: str) -> None:
    file = tmp_path / "fragen.yaml"
    file.write_text(f"- {entry}\n", "utf-8")

    with pytest.raises(ValueError, match="x"):
        load_answer_questions(file)
