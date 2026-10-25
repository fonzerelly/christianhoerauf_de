from bot.domain.intent import Intent


def test_there_are_exactly_the_eighteen_intents_of_absichten_md() -> None:
    assert [intent.value for intent in Intent] == [
        "general/knowledge",
        "general/smalltalk",
        "general/bot",
        "general/flirt",
        "general/task",
        "general/advice",
        "general/politics",
        "christian/career",
        "christian/private",
        "christian/terms",
        "christian/contact",
        "christian/assessment",
        "christian/picture",
        "sensitive/sexual",
        "sensitive/dangerous",
        "sensitive/insult",
        "jailbreak",
        "gibberish",
    ]


def test_group_is_the_part_before_the_slash_or_the_whole_value() -> None:
    assert Intent.KNOWLEDGE.group == "general"
    assert Intent.PICTURE.group == "christian"
    assert Intent.SEXUAL.group == "sensitive"
    assert Intent.JAILBREAK.group == "jailbreak"
    assert Intent.GIBBERISH.group == "gibberish"
