import json
from pathlib import Path

import pytest

from bot.domain.intent import Intent
from bot.pipeline.intent_classifier import IntentClassifier, IntentProgram, read_intent
from bot.pipeline.prompts import load_intent_program
from bot.ports.language_model import LanguageModelError, Message
from tests.fakes import FakeLanguageModel, failing_model

# Golden Master: Nachrichten von DSPys ChatAdapter (testsammlung/training.py)
GOLDEN_FILE = Path(__file__).parent / "intent_golden.json"
GOLDEN = json.loads(GOLDEN_FILE.read_text(encoding="utf-8"))

SMALL_PROGRAM = IntentProgram(
    labels=tuple(intent.value for intent in Intent),
    messages=(
        {"role": "system", "content": "SYSTEM"},
        {"role": "user", "content": "BEISPIEL"},
        {"role": "assistant", "content": "general/knowledge"},
    ),
    question_prefix="[[ ## frage ## ]]\n",
    question_suffix="\n\nENDE",
)


def program_json(**changes: object) -> str:
    fields: dict[str, object] = {
        "labels": [intent.value for intent in Intent],
        "messages": [{"role": "system", "content": "SYSTEM"}],
        "question_prefix": "A",
        "question_suffix": "B",
    }
    fields.update(changes)
    return json.dumps(fields)


@pytest.mark.parametrize("case", GOLDEN, ids=lambda case: case["question"][:20])
def test_messages_are_exactly_the_ones_dspy_builds(case: dict[str, object]) -> None:
    assert load_intent_program().messages_for(str(case["question"])) == case["messages"]


def test_messages_for_puts_the_question_between_prefix_and_suffix() -> None:
    messages = SMALL_PROGRAM.messages_for("Wie hoch ist die Zugspitze?")

    assert messages == [
        {"role": "system", "content": "SYSTEM"},
        {"role": "user", "content": "BEISPIEL"},
        {"role": "assistant", "content": "general/knowledge"},
        {"role": "user", "content": "[[ ## frage ## ]]\nWie hoch ist die Zugspitze?\n\nENDE"},
    ]


def test_from_json_reads_all_fields() -> None:
    program = IntentProgram.from_json(program_json())

    assert program.messages == ({"role": "system", "content": "SYSTEM"},)
    assert (program.question_prefix, program.question_suffix) == ("A", "B")


def test_from_json_refuses_labels_that_do_not_match_the_intents() -> None:
    with pytest.raises(ValueError, match="Kürzel"):
        IntentProgram.from_json(program_json(labels=["general/knowledge"]))


@pytest.mark.parametrize(
    ("reply", "expected"),
    [
        ("[[ ## absicht ## ]]\ngeneral/knowledge\n\n[[ ## completed ## ]]", Intent.KNOWLEDGE),
        ("[[ ## absicht ## ]] jailbreak\n[[ ## completed ## ]]", Intent.JAILBREAK),
        ("  [[ ## absicht ## ]]\n  'christian/career'  \n", Intent.CAREER),
        ('[[ ## absicht ## ]]\n"sensitive/sexual"', Intent.SEXUAL),
        ("[[ ## absicht ## ]]\nLiteral['christian/picture']", Intent.PICTURE),
        ("[[ ## absicht ## ]]\ngeneral/bot\n[[ ## absicht ## ]]\njailbreak", Intent.BOT),
        ("general/task", Intent.TASK),
    ],
)
def test_read_intent_takes_the_absicht_field_like_dspy(reply: str, expected: Intent) -> None:
    assert read_intent(reply) is expected


@pytest.mark.parametrize(
    "reply",
    [
        "",
        "keine Ahnung",
        "[[ ## absicht ## ]]\nchristian/privat",
        "[[ ## absicht ## ]]\ngeneral/knowledge oder general/task",
        "[[ ## frage ## ]]\ngeneral/knowledge",
    ],
)
def test_unreadable_reply_counts_as_gibberish(reply: str) -> None:
    assert read_intent(reply) is Intent.GIBBERISH


def test_classifier_sends_the_program_messages_and_reads_the_reply() -> None:
    model = FakeLanguageModel(["[[ ## absicht ## ]]\nchristian/contact\n[[ ## completed ## ]]"])

    intent = IntentClassifier(model, SMALL_PROGRAM).classify("Wie erreiche ich ihn?")

    assert intent is Intent.CONTACT
    expected: list[Message] = SMALL_PROGRAM.messages_for("Wie erreiche ich ihn?")
    assert model.calls == [expected]


def test_model_failure_is_passed_on() -> None:
    with pytest.raises(LanguageModelError):
        IntentClassifier(failing_model(), SMALL_PROGRAM).classify("Frage?")
