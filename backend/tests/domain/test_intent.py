from bot.domain.intent import Intent


def test_there_are_exactly_the_four_intents() -> None:
    assert {intent.value for intent in Intent} == {
        "general",
        "about_christian",
        "gimmick",
        "disallowed",
    }
