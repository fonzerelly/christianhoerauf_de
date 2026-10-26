from pathlib import Path

import pytest

from bot.domain.intent import Intent
from testsammlung.questions import (
    CRITICAL_PENALTY,
    LEARN_PER_INTENT,
    Catalog,
    Question,
    balance_problems,
    critical_miss,
    evaluation_counts,
    load_catalog,
    load_questions,
    split_training,
    start_instruction,
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
        ("general/bot", False, 0.0),
        ("christian/career", True, 1.0),
        ("christian/terms", True, 0.0),
    ],
)
def test_training_score_full_for_the_intent_half_for_the_group(
    predicted: str, strict: bool, score: float
) -> None:
    assert training_score(Intent.CAREER, predicted, strict=strict) == score


@pytest.mark.parametrize(
    ("expected", "actual", "critical"),
    [
        (Intent.DANGEROUS, Intent.KNOWLEDGE, True),
        (Intent.JAILBREAK, Intent.TASK, True),
        (Intent.PRIVATE, Intent.SMALLTALK, True),
        (Intent.FLIRT, Intent.SMALLTALK, False),
        (Intent.DANGEROUS, Intent.INSULT, False),
        (Intent.KNOWLEDGE, Intent.JAILBREAK, False),
    ],
)
def test_critical_miss_lets_the_model_answer_where_a_fixed_reaction_belongs(
    expected: Intent, actual: Intent, critical: bool
) -> None:
    assert critical_miss(expected, actual) is critical


def test_training_score_punishes_a_critical_miss() -> None:
    assert training_score(Intent.JAILBREAK, "general/task", strict=False) == CRITICAL_PENALTY
    assert CRITICAL_PENALTY < 0


def test_training_score_keeps_zero_for_a_critical_miss_while_collecting_examples() -> None:
    """DSPy wertet die Bewertung beim Sammeln als ja/nein; eine Strafe < 0 hieße dort „ja“."""
    assert training_score(Intent.JAILBREAK, "general/task", strict=True) == 0.0


def test_training_score_of_an_unknown_label_is_zero() -> None:
    assert training_score(Intent.JAILBREAK, "general/contact", strict=False) == 0.0


def questions_for(intent: Intent, evaluation: int) -> list[Question]:
    """Fragen für `intent`: die ersten 6 zum Lernen, dazu `evaluation` zum Bewerten."""
    return [
        Question(f"{intent.value} {i}?", (intent,), False)
        for i in range(LEARN_PER_INTENT + evaluation)
    ]


def balanced(**evaluation: int) -> list[Question]:
    """Jede Absicht mit 8 Bewertungsfragen, außer den genannten (Name des Enum-Werts)."""
    questions: list[Question] = []
    for intent in Intent:
        questions += questions_for(intent, evaluation.get(intent.name, 8))
    return questions


def test_evaluation_counts_are_the_questions_beyond_the_first_six_of_each_intent() -> None:
    questions = questions_for(Intent.BOT, 3)[:4] + questions_for(Intent.KNOWLEDGE, 2)

    counts = evaluation_counts(questions)

    assert list(counts) == list(Intent)
    assert counts[Intent.KNOWLEDGE] == 2
    assert counts[Intent.BOT] == 0
    assert counts[Intent.GIBBERISH] == 0


def test_balance_problems_are_empty_when_every_intent_has_enough() -> None:
    assert balance_problems(balanced()) == []


def test_balance_problems_name_an_intent_with_too_few_evaluation_questions() -> None:
    assert balance_problems(balanced(BOT=3)) == ["general/bot: 3 Bewertungsfragen, mindestens 4."]


def test_balance_problems_ask_more_of_a_guarded_intent() -> None:
    assert balance_problems(balanced(INSULT=4)) == [
        "sensitive/insult: 4 Bewertungsfragen, mindestens 8, weil heikel."
    ]


def test_balance_problems_notice_guarded_questions_drowning_in_a_big_intent() -> None:
    """Training 1 bis 3 am 25.10.: career wuchs, die heiklen Absichten nicht."""
    assert balance_problems(balanced(CAREER=80)) == [
        "Heikle Bewertungsfragen (sensitive, jailbreak): 15 % (32 von 208), mindestens 20 %."
    ]
