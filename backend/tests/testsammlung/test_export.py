import pytest

from bot.ports.language_model import Message
from testsammlung.export import PLACEHOLDER, program_export

DSPY_MESSAGES: list[Message] = [
    {"role": "system", "content": "SYSTEM"},
    {"role": "user", "content": "BEISPIEL"},
    {"role": "assistant", "content": "general/knowledge"},
    {"role": "user", "content": f"[[ ## frage ## ]]\n{PLACEHOLDER}\n\nENDE"},
]


def test_export_keeps_the_fixed_messages_and_splits_the_last_one_at_the_question() -> None:
    assert program_export(["general/knowledge", "gibberish"], DSPY_MESSAGES) == {
        "labels": ["general/knowledge", "gibberish"],
        "messages": DSPY_MESSAGES[:3],
        "question_prefix": "[[ ## frage ## ]]\n",
        "question_suffix": "\n\nENDE",
    }


@pytest.mark.parametrize(
    "last",
    [
        {"role": "assistant", "content": PLACEHOLDER},
        {"role": "user", "content": "ohne Platzhalter"},
        {"role": "user", "content": PLACEHOLDER + PLACEHOLDER},
    ],
)
def test_export_refuses_an_unexpected_last_message(last: Message) -> None:
    with pytest.raises(ValueError, match="letzten Nachricht"):
        program_export(["gibberish"], [DSPY_MESSAGES[0], last])
