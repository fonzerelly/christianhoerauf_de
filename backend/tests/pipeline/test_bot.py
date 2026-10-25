from datetime import date

import pytest

from bot.adapters.memory_store import MemoryStore
from bot.domain.answer import Answer
from bot.domain.cost_protection import (
    cache_key,
    daily_counter_key,
    visitor_counter_key,
    visitor_tag,
)
from bot.domain.fixed_answers import intent_answer
from bot.domain.intent import Intent
from bot.domain.reaction import ReactionKind, reaction_for
from bot.pipeline.bot import Bot
from bot.pipeline.general_answerer import GeneralAnswerer
from bot.pipeline.intent_classifier import IntentClassifier, IntentProgram
from bot.ports.language_model import LanguageModelError
from tests.fakes import FakeClock, FakeLanguageModel, ListLog

DAY = date(2026, 10, 22)
IP = "203.0.113.7"
SECRET = "tagessalz-geheimnis"
PROGRAM = IntentProgram(
    labels=tuple(intent.value for intent in Intent),
    messages=({"role": "system", "content": "TÜRSTEHER"},),
    question_prefix="",
    question_suffix="",
)
FIXED_INTENTS = [
    intent
    for intent in Intent
    if reaction_for(intent) in {ReactionKind.FIXED_TEXT, ReactionKind.GIMMICK}
]


def gate(intent: Intent) -> str:
    """So antwortet der Türsteher im Format von DSPys ChatAdapter."""
    return f"[[ ## absicht ## ]]\n{intent.value}\n\n[[ ## completed ## ]]"


class Setup:
    def __init__(
        self,
        intents: list[Intent | Exception | str],
        answers: list[str | Exception] | None = None,
        task_answers: list[str | Exception] | None = None,
        cache_version: str = "",
    ) -> None:
        replies = [gate(i) if isinstance(i, Intent) else i for i in intents]
        self.intent_model = FakeLanguageModel(replies)
        self.answer_model = FakeLanguageModel(answers or [])
        self.task_model = FakeLanguageModel(task_answers or [])
        self.store = MemoryStore()
        self.log = ListLog()
        self.bot = Bot(
            IntentClassifier(self.intent_model, PROGRAM),
            GeneralAnswerer(self.answer_model, "ALLGEMEIN"),
            GeneralAnswerer(self.task_model, "AUFTRAG"),
            self.store,
            FakeClock(DAY),
            self.log,
            SECRET,
            cache_version=cache_version,
        )

    def visitor_count_after_one_more(self) -> int:
        return self.store.increment(visitor_counter_key(visitor_tag(IP, SECRET, DAY), DAY))


@pytest.mark.parametrize("intent", [Intent.KNOWLEDGE, Intent.SMALLTALK])
def test_knowledge_and_smalltalk_are_answered_by_the_model(intent: Intent) -> None:
    setup = Setup([intent], ["Canberra."])

    answer = setup.bot.ask("Hauptstadt von Australien?", IP)

    assert answer == Answer(text="Canberra.")
    assert setup.answer_model.calls[0][0] == {"role": "system", "content": "ALLGEMEIN"}
    assert setup.task_model.calls == []


def test_task_is_answered_with_the_task_prompt() -> None:
    setup = Setup([Intent.TASK], task_answers=["Die Kurzfassung: Es wird wärmer."])

    answer = setup.bot.ask("Schreib mir einen Aufsatz über das Klima.", IP)

    assert answer.text == "Die Kurzfassung: Es wird wärmer."
    assert setup.task_model.calls[0][0] == {"role": "system", "content": "AUFTRAG"}
    assert setup.answer_model.calls == []


def test_reply_is_checked_before_it_is_returned() -> None:
    setup = Setup([Intent.KNOWLEDGE], ["Super 😀 gemacht"])

    assert setup.bot.ask("Frage?", IP).text == "Super gemacht"


@pytest.mark.parametrize("intent", FIXED_INTENTS, ids=lambda intent: intent.value)
def test_every_other_intent_gets_its_fixed_text_without_an_answer_call(intent: Intent) -> None:
    setup = Setup([intent])

    answer = setup.bot.ask("Frage?", IP)

    assert answer == intent_answer(intent, "de")
    assert setup.answer_model.calls == []
    assert setup.task_model.calls == []


def test_fixed_text_comes_in_the_language_of_the_question() -> None:
    setup = Setup([Intent.CAREER, Intent.CAREER])

    german = setup.bot.ask("Wo arbeitet Christian?", IP)
    english = setup.bot.ask("What is the job of Christian?", IP)

    assert german.text == "Darüber lerne ich gerade noch."
    assert english.text == "I can answer that soon."


def test_unreadable_gate_reply_is_treated_as_gibberish_not_refused() -> None:
    setup = Setup(["Ich weiß es nicht."])

    answer = setup.bot.ask("Ich will einfach nicht mehr leben.", IP)

    assert answer.text == "Das habe ich nicht verstanden."
    assert setup.log.records[0]["intent"] == "gibberish"


def test_same_question_again_comes_from_the_cache_without_model_calls() -> None:
    setup = Setup([Intent.KNOWLEDGE], ["Canberra."])
    setup.bot.ask("Hauptstadt von Australien?", IP)

    answer = setup.bot.ask("  hauptstadt VON australien? ", "198.51.100.1")

    assert answer.text == "Canberra."
    assert len(setup.intent_model.calls) == 1
    assert len(setup.answer_model.calls) == 1


def test_daily_limit_gives_the_fixed_answer_before_any_model_call() -> None:
    setup = Setup([])
    for _ in range(2000):
        setup.store.increment(daily_counter_key(DAY))

    answer = setup.bot.ask("Frage?", IP)

    assert answer.text.startswith("Für heute habe ich genug")
    assert setup.intent_model.calls == []


def test_visitor_limit_stops_model_answers_only_for_that_visitor() -> None:
    setup = Setup([Intent.KNOWLEDGE, Intent.KNOWLEDGE], ["Antwort."])
    tag = visitor_tag(IP, SECRET, DAY)
    for _ in range(10):
        setup.store.increment(visitor_counter_key(tag, DAY))

    blocked = setup.bot.ask("Noch eine Frage?", IP)
    other = setup.bot.ask("Noch eine Frage?", "198.51.100.1")

    assert blocked.text.startswith("Du hast heute schon viele Fragen")
    assert other.text == "Antwort."


def test_a_task_counts_for_the_visitor() -> None:
    setup = Setup([Intent.TASK], task_answers=["Kurz."])

    setup.bot.ask("Schreib mir ein Gedicht.", IP)

    assert setup.visitor_count_after_one_more() == 2


def test_fixed_texts_do_not_count_for_the_visitor() -> None:
    setup = Setup([Intent.CAREER])

    setup.bot.ask("Wo arbeitet Christian?", IP)

    assert setup.visitor_count_after_one_more() == 1


def test_cached_answers_do_not_count_for_the_visitor() -> None:
    setup = Setup([])
    setup.store.write(cache_key("Frage?", DAY), "Gespeichert.")

    assert setup.bot.ask("Frage?", IP).text == "Gespeichert."
    assert setup.visitor_count_after_one_more() == 1


@pytest.mark.parametrize("failing", ["intent", "answer", "task"])
def test_model_failure_gives_the_unavailable_answer_and_is_not_cached(failing: str) -> None:
    error = LanguageModelError("kaputt")
    setup = {
        "intent": Setup([error]),
        "answer": Setup([Intent.KNOWLEDGE], [error]),
        "task": Setup([Intent.TASK], task_answers=[error]),
    }[failing]

    answer = setup.bot.ask("Frage?", IP)

    assert answer.text == "Ich bin gerade nicht erreichbar. Versuch es gleich noch einmal."
    assert setup.store.read(cache_key("Frage?", DAY)) is None


def test_empty_model_reply_gives_the_unavailable_answer() -> None:
    setup = Setup([Intent.KNOWLEDGE], ["😀"])

    assert setup.bot.ask("Frage?", IP).text.startswith("Ich bin gerade nicht erreichbar")


def test_log_has_question_intent_answer_visitor_tag_and_duration_but_not_the_ip() -> None:
    setup = Setup([Intent.KNOWLEDGE], ["Canberra."])

    setup.bot.ask("Hauptstadt von Australien?", IP)

    assert setup.log.records == [
        {
            "question": "Hauptstadt von Australien?",
            "intent": "general/knowledge",
            "outcome": "answered",
            "answer": "Canberra.",
            "visitor": visitor_tag(IP, SECRET, DAY),
            "duration_ms": 500,
        }
    ]
    assert IP not in str(setup.log.records)


@pytest.mark.parametrize(
    ("intents", "outcome", "intent"),
    [
        ([Intent.CAREER], "fixed_text", "christian/career"),
        ([Intent.JAILBREAK], "fixed_text", "jailbreak"),
        ([Intent.FLIRT], "gimmick", "general/flirt"),
        ([LanguageModelError("kaputt")], "unavailable", None),
    ],
)
def test_log_outcome_and_intent(
    intents: list[Intent | Exception | str], outcome: str, intent: str | None
) -> None:
    setup = Setup(intents)

    setup.bot.ask("Frage?", IP)

    assert setup.log.records[0]["outcome"] == outcome
    assert setup.log.records[0]["intent"] == intent


def test_log_keeps_the_intent_when_the_answer_fails() -> None:
    setup = Setup([Intent.KNOWLEDGE], [LanguageModelError("kaputt")])

    setup.bot.ask("Frage?", IP)

    assert setup.log.records[0]["outcome"] == "unavailable"
    assert setup.log.records[0]["intent"] == "general/knowledge"


def test_log_marks_cache_and_limit_outcomes() -> None:
    cached = Setup([])
    cached.store.write(cache_key("Frage?", DAY), "Gespeichert.")
    limited = Setup([])
    for _ in range(2000):
        limited.store.increment(daily_counter_key(DAY))

    cached.bot.ask("Frage?", IP)
    limited.bot.ask("Frage?", IP)

    assert cached.log.records[0]["outcome"] == "cache"
    assert limited.log.records[0]["outcome"] == "limit"


def test_answers_cached_by_an_earlier_rollout_are_not_used() -> None:
    setup = Setup([Intent.KNOWLEDGE], ["Neu."], cache_version="neu")
    setup.store.write(cache_key("Frage?", DAY, version="alt"), "Alt.")

    assert setup.bot.ask("Frage?", IP).text == "Neu."
    assert setup.store.read(cache_key("Frage?", DAY, version="neu")) == "Neu."
