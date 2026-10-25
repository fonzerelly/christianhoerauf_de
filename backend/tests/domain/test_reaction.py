from bot.domain.intent import Intent
from bot.domain.reaction import ReactionKind, reaction_for


def test_the_model_answers_freely_only_knowledge_and_smalltalk() -> None:
    free = [intent for intent in Intent if reaction_for(intent) is ReactionKind.GENERAL_ANSWER]

    assert free == [Intent.KNOWLEDGE, Intent.SMALLTALK]


def test_a_task_gets_its_own_model_prompt() -> None:
    assert reaction_for(Intent.TASK) is ReactionKind.TASK_ANSWER


def test_flirt_sexual_and_picture_are_gimmicks() -> None:
    gimmicks = [intent for intent in Intent if reaction_for(intent) is ReactionKind.GIMMICK]

    assert gimmicks == [Intent.FLIRT, Intent.PICTURE, Intent.SEXUAL]


def test_every_other_intent_gets_a_fixed_text() -> None:
    fixed = {intent for intent in Intent if reaction_for(intent) is ReactionKind.FIXED_TEXT}

    assert fixed == {
        Intent.BOT,
        Intent.ADVICE,
        Intent.LIVE_DATA,
        Intent.POLITICS,
        Intent.CAREER,
        Intent.PRIVATE,
        Intent.TERMS,
        Intent.CONTACT,
        Intent.ASSESSMENT,
        Intent.DANGEROUS,
        Intent.INSULT,
        Intent.JAILBREAK,
        Intent.GIBBERISH,
    }


def test_sensitive_jailbreak_and_christian_never_reach_the_model() -> None:
    model_kinds = {ReactionKind.GENERAL_ANSWER, ReactionKind.TASK_ANSWER}
    guarded = [i for i in Intent if i.group in {"sensitive", "jailbreak", "christian"}]

    assert all(reaction_for(intent) not in model_kinds for intent in guarded)
