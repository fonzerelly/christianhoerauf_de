from pathlib import Path

import pytest

from bot.domain.intent import Intent
from testsammlung.questions import (
    Catalog,
    Question,
    load_catalog,
    load_questions,
    split_training,
    start_instruction,
    thin_intents,
    training_score,
)

ALL_DESCRIPTIONS = "".join(f"  {intent.value}: Beschreibung {intent.value}\n" for intent in Intent)


def catalog_yaml(descriptions: str = ALL_DESCRIPTIONS) -> str:
    return (
        "regeln:\n  - Erste Regel.\n  - Zweite Regel.\n"
        f"absichten:\n{descriptions}"
        "beispiele:\n  general/knowledge: Wie hoch ist die Zugspitze?\n"
    )


def test_load_questions_reads_text_intents_and_borderline(tmp_path: Path) -> None:
    file = tmp_path / "fragen.yaml"
    file.write_text(
        '- {frage: "Hauptstadt?", absicht: general/knowledge}\n'
        '- {frage: "Nummer?", absicht: general/flirt christian/contact, grenzfall: true}\n'
        '- {frage: "Code?", absicht: [general/task, general/knowledge]}\n',
        encoding="utf-8",
    )

    assert load_questions(file) == [
        Question("Hauptstadt?", (Intent.KNOWLEDGE,), borderline=False),
        Question("Nummer?", (Intent.FLIRT, Intent.CONTACT), borderline=True),
        Question("Code?", (Intent.TASK, Intent.KNOWLEDGE), borderline=False),
    ]


def test_unknown_label_in_questions_is_refused(tmp_path: Path) -> None:
    file = tmp_path / "fragen.yaml"
    file.write_text('- {frage: "A?", absicht: christian/privat}\n', encoding="utf-8")

    with pytest.raises(ValueError, match="christian/privat"):
        load_questions(file)


def test_first_intent_is_the_main_intent() -> None:
    assert Question("A?", (Intent.FLIRT, Intent.CONTACT), False).intent is Intent.FLIRT


@pytest.mark.parametrize(
    ("actual", "reference"),
    [
        (Intent.CONTACT, Intent.CONTACT),  # erlaubt: sie selbst
        (Intent.CAREER, Intent.CONTACT),  # gleiche Gruppe wie eine erlaubte
        (Intent.SMALLTALK, Intent.FLIRT),  # gleiche Gruppe wie die Hauptabsicht
        (Intent.JAILBREAK, Intent.FLIRT),  # sonst die Hauptabsicht
    ],
)
def test_reference_is_the_allowed_intent_the_answer_is_measured_against(
    actual: Intent, reference: Intent
) -> None:
    question = Question("Nummer?", (Intent.FLIRT, Intent.CONTACT), True)

    assert question.reference(actual) is reference


def test_load_catalog_reads_rules_and_descriptions(tmp_path: Path) -> None:
    file = tmp_path / "absichten.yaml"
    file.write_text(catalog_yaml(), encoding="utf-8")

    catalog = load_catalog(file)

    assert catalog.rules == ("Erste Regel.", "Zweite Regel.")
    assert catalog.descriptions[Intent.KNOWLEDGE] == "Beschreibung general/knowledge"
    assert list(catalog.descriptions) == list(Intent)


@pytest.mark.parametrize(
    "descriptions",
    [
        ALL_DESCRIPTIONS.replace("  gibberish: Beschreibung gibberish\n", ""),
        "  general/smalltalk: S\n" + ALL_DESCRIPTIONS.replace("  general/smalltalk: ", "  #"),
    ],
    ids=["fehlt eine", "andere Reihenfolge"],
)
def test_catalog_must_list_exactly_the_intents_of_the_code_in_their_order(
    tmp_path: Path, descriptions: str
) -> None:
    file = tmp_path / "absichten.yaml"
    file.write_text(catalog_yaml(descriptions), encoding="utf-8")

    with pytest.raises(ValueError, match="Intent"):
        load_catalog(file)


def test_start_instruction_has_task_rules_and_all_intents() -> None:
    catalog = Catalog(
        rules=("Erste Regel.",),
        descriptions={Intent.KNOWLEDGE: "Wissen.", Intent.GIBBERISH: "Unsinn."},
    )

    assert start_instruction(catalog) == (
        "Du ordnest Fragen, die Besucher auf der Webseite von Christian Hörauf einem Bot stellen, "
        "genau einer Absicht zu.\n\n"
        "Regeln:\n- Erste Regel.\n\n"
        "Absichten:\n- general/knowledge: Wissen.\n- gibberish: Unsinn."
    )


def test_split_training_takes_the_first_six_of_each_intent_to_learn() -> None:
    knowledge = [Question(f"K{i}?", (Intent.KNOWLEDGE,), False) for i in range(8)]
    bot = [Question(f"B{i}?", (Intent.BOT,), False) for i in range(7)]

    learn, evaluate = split_training([*bot, *knowledge])

    assert learn == knowledge[:6] + bot[:6]
    assert evaluate == knowledge[6:] + bot[6:]


@pytest.mark.parametrize(
    ("predicted", "strict", "score"),
    [
        ("christian/career", False, 1.0),
        ("christian/terms", False, 0.5),
        ("general/knowledge", False, 0.0),
        ("christian/career", True, 1.0),
        ("christian/terms", True, 0.0),
    ],
)
def test_training_score_full_for_the_intent_half_for_the_group(
    predicted: str, strict: bool, score: float
) -> None:
    assert training_score(Intent.CAREER, predicted, strict=strict) == score


def test_thin_intents_have_too_few_training_questions_to_learn_and_evaluate() -> None:
    questions = [Question(f"K{i}?", (Intent.KNOWLEDGE,), False) for i in range(7)]
    questions += [Question(f"B{i}?", (Intent.BOT,), False) for i in range(6)]

    thin = thin_intents(questions)

    assert thin[:2] == [(Intent.SMALLTALK, 0), (Intent.BOT, 6)]
    assert Intent.KNOWLEDGE not in dict(thin)
    assert len(thin) == len(Intent) - 1
