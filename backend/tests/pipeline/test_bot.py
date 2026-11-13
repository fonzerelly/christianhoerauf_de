import json
from datetime import date

import pytest

from bot.adapters.memory_store import MemoryStore
from bot.domain.answer import Answer
from bot.domain.cost_protection import (
    cache_key,
    conversation_key,
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
from bot.pipeline.question_rewriter import Exchange, QuestionRewriter
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


def stored(text: str) -> str:
    """So steht eine Antwort ohne Stichwort im Zwischenspeicher."""
    return json.dumps({"text": text})


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
        knowledge_answers: list[str | Exception] | None = None,
        rewrites: list[str | Exception] | None = None,
    ) -> None:
        replies = [gate(i) if isinstance(i, Intent) else i for i in intents]
        self.intent_model = FakeLanguageModel(replies)
        self.answer_model = FakeLanguageModel(answers or [])
        self.task_model = FakeLanguageModel(task_answers or [])
        self.knowledge_model = FakeLanguageModel(knowledge_answers or [])
        self.rewrite_model = FakeLanguageModel(rewrites or [])
        # Ohne `knowledge_answers` gibt es keine Texte: der Bot bekommt keine Wissensbasis.
        knowledge_answerer = (
            None
            if knowledge_answers is None
            else GeneralAnswerer(self.knowledge_model, "WISSENSBASIS")
        )
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
            knowledge_answerer=knowledge_answerer,
            rewriter=QuestionRewriter(self.rewrite_model, "UMSCHREIBEN"),
        )

    def visitor_count_after_one_more(self) -> int:
        return self.store.increment(visitor_counter_key(visitor_tag(IP, SECRET, DAY), DAY))


@pytest.mark.parametrize("intent", [Intent.KNOWLEDGE, Intent.SMALLTALK, Intent.LIVE_DATA])
def test_knowledge_smalltalk_and_live_data_are_answered_by_the_model(intent: Intent) -> None:
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

    assert answer.text == intent_answer(intent, "de").text
    assert setup.answer_model.calls == []
    assert setup.task_model.calls == []


def test_flirt_sexual_and_picture_bring_their_gimmick_along_with_the_fixed_text() -> None:
    setup = Setup([Intent.FLIRT, Intent.SEXUAL, Intent.PICTURE])

    heart = setup.bot.ask("Ich liebe dich, Bot", IP)
    hand = setup.bot.ask("Was ist Cuckolding?", IP)
    picture = setup.bot.ask("Zeig mir ein Foto von ihm", IP)

    assert heart == Answer(intent_answer(Intent.FLIRT, "de").text, {"type": "heart"})
    assert hand == Answer(
        intent_answer(Intent.SEXUAL, "de").text, {"type": "face_with_hand_over_mouth"}
    )
    assert picture == Answer(intent_answer(Intent.PICTURE, "de").text, {"type": "photo"})


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
    setup = Setup([Intent.TASK], task_answers=["Ein Gedicht."])
    setup.bot.ask("Schreib ein Gedicht!", IP)

    answer = setup.bot.ask("  schreib EIN gedicht! ", "198.51.100.1")

    assert answer.text == "Ein Gedicht."
    assert len(setup.intent_model.calls) == 1
    assert len(setup.task_model.calls) == 1


def test_general_answers_are_not_cached_because_they_know_the_time() -> None:
    setup = Setup([Intent.LIVE_DATA, Intent.LIVE_DATA], ["Es ist 14:30 Uhr.", "Es ist 14:31 Uhr."])
    setup.bot.ask("Wie spät ist es?", IP)

    answer = setup.bot.ask("Wie spät ist es?", IP)

    assert answer.text == "Es ist 14:31 Uhr."
    assert setup.store.read(cache_key("Wie spät ist es?", DAY)) is None


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
    setup.store.write(cache_key("Frage?", DAY), stored("Gespeichert."))

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
    cached.store.write(cache_key("Frage?", DAY), stored("Gespeichert."))
    limited = Setup([])
    for _ in range(2000):
        limited.store.increment(daily_counter_key(DAY))

    cached.bot.ask("Frage?", IP)
    limited.bot.ask("Frage?", IP)

    assert cached.log.records[0]["outcome"] == "cache"
    assert limited.log.records[0]["outcome"] == "limit"


def test_answers_cached_by_an_earlier_rollout_are_not_used() -> None:
    setup = Setup([Intent.TASK], task_answers=["Neu."], cache_version="neu")
    setup.store.write(cache_key("Frage?", DAY, version="alt"), stored("Alt."))

    assert setup.bot.ask("Frage?", IP).text == "Neu."
    assert setup.store.read(cache_key("Frage?", DAY, version="neu")) == stored("Neu.")


def test_career_is_answered_from_the_knowledge_base_when_it_has_texts() -> None:
    setup = Setup([Intent.CAREER], knowledge_answers=["Chris war bei Navigon."])

    answer = setup.bot.ask("Wo war er nach dem Studium?", IP)

    assert answer == Answer(text="Chris war bei Navigon.")
    assert setup.knowledge_model.calls[0][0] == {"role": "system", "content": "WISSENSBASIS"}
    assert setup.answer_model.calls == []
    assert setup.log.records[0]["outcome"] == "answered"


def test_career_answers_count_for_the_visitor() -> None:
    setup = Setup([Intent.CAREER], knowledge_answers=["Chris war bei Navigon."])

    setup.bot.ask("Wo war er nach dem Studium?", IP)

    assert setup.visitor_count_after_one_more() == 2


def test_without_knowledge_texts_career_gets_its_fixed_text_and_logs_it_as_such() -> None:
    setup = Setup([Intent.CAREER])

    answer = setup.bot.ask("Wo war er nach dem Studium?", IP)

    assert answer == intent_answer(Intent.CAREER, "de")
    assert setup.log.records[0]["outcome"] == "fixed_text"


FIELDS_REPLY = (
    "[[ ## antwort ## ]]\nChris baute bei Navigon Spracherkennung 😀.\n\n"
    "[[ ## stichwort ## ]]\nNavigon Highlights\n\n"
    "[[ ## folgefragen ## ]]\nWas erlebte Chris mit der Polizei?\nWarum nutzte man C++?"
)
FIELDS_ANSWER = Answer(
    text="Chris baute bei Navigon Spracherkennung .",
    keyword="Navigon Highlights",
    suggestions=("Was erlebte Chris mit der Polizei?",),
)


def test_knowledge_answer_brings_its_checked_keyword_and_suggestions() -> None:
    setup = Setup([Intent.CAREER], knowledge_answers=[FIELDS_REPLY])

    answer = setup.bot.ask("Was hat Chris bei Navigon gemacht?", IP)

    assert answer == FIELDS_ANSWER


def test_cached_knowledge_answer_keeps_keyword_and_suggestions() -> None:
    setup = Setup([Intent.CAREER], knowledge_answers=[FIELDS_REPLY])
    setup.bot.ask("Was hat Chris bei Navigon gemacht?", IP)

    answer = setup.bot.ask("Was hat Chris bei Navigon gemacht?", IP)

    assert answer == FIELDS_ANSWER
    assert len(setup.knowledge_model.calls) == 1


def test_log_has_keyword_and_suggestions_of_a_knowledge_answer() -> None:
    setup = Setup([Intent.CAREER], knowledge_answers=[FIELDS_REPLY])

    setup.bot.ask("Was hat Chris bei Navigon gemacht?", IP)

    record = setup.log.records[0]
    assert (record.get("keyword"), record.get("suggestions")) == (
        "Navigon Highlights",
        ["Was erlebte Chris mit der Polizei?"],
    )


def test_a_follow_up_the_bot_suggested_skips_the_gate_and_is_answered_from_the_knowledge_base() -> (
    None
):
    # Ohne Abkürzung stufte der Türsteher sie als Allgemeinwissen ein.
    setup = Setup(
        [Intent.CAREER, Intent.KNOWLEDGE],
        answers=["Allgemein."],
        knowledge_answers=[FIELDS_REPLY, "Chris wurde angehalten."],
    )
    setup.bot.ask("Was hat Chris bei Navigon gemacht?", IP)

    answer = setup.bot.ask("was erlebte Chris mit der  Polizei?", IP)

    assert answer.text == "Chris wurde angehalten."
    assert len(setup.intent_model.calls) == 1
    record = setup.log.records[1]
    assert (record["intent"], record.get("suggested")) == ("christian/career", True)


def test_a_dropped_or_edited_follow_up_goes_through_the_gate() -> None:
    setup = Setup(
        [Intent.CAREER, Intent.KNOWLEDGE, Intent.KNOWLEDGE],
        answers=["C++ ist schnell.", "Weil es schnell ist."],
        knowledge_answers=[FIELDS_REPLY],
    )
    setup.bot.ask("Was hat Chris bei Navigon gemacht?", IP)

    setup.bot.ask("Warum nutzte man C++?", IP)
    setup.bot.ask("Was erlebte Chris mit der Polizei? Und warum?", IP)

    assert len(setup.intent_model.calls) == 3
    assert [record.get("suggested") for record in setup.log.records] == [None, None, None]


def test_a_suggestion_skips_the_gate_only_for_the_visitor_it_was_suggested_to() -> None:
    # Plan, „Folgefragen-Lücke“: Sonst käme jeder an diesem Tag mit ihr am Türsteher vorbei.
    setup = Setup(
        [Intent.CAREER, Intent.KNOWLEDGE],
        answers=["Allgemein."],
        knowledge_answers=[FIELDS_REPLY],
    )
    setup.bot.ask("Was hat Chris bei Navigon gemacht?", IP)

    answer = setup.bot.ask("Was erlebte Chris mit der Polizei?", "198.51.100.1")

    assert answer.text == "Allgemein."


CONVERSATION = "4f1c2a9e-0b7d-4c55-9d3e-2a6b8f0c1d2e"
STUDIED = "Chris studierte Medientechnologie in Ilmenau."


def test_without_a_conversation_nothing_is_rewritten() -> None:
    setup = Setup([Intent.CAREER, Intent.CAREER], knowledge_answers=[STUDIED, "Fünf Jahre."])
    setup.bot.ask("Was hat Chris studiert?", IP)

    setup.bot.ask("Wie lange hat das gedauert?", IP)

    assert setup.rewrite_model.calls == []


def test_the_first_question_of_a_conversation_is_not_rewritten() -> None:
    setup = Setup([Intent.CAREER], knowledge_answers=[STUDIED])

    setup.bot.ask("Was hat Chris studiert?", IP, CONVERSATION)

    assert setup.rewrite_model.calls == []


def test_a_follow_up_is_rewritten_with_the_last_exchange_and_answered_as_rewritten() -> None:
    standalone = "Wie lange hat das Studium von Chris in Ilmenau gedauert?"
    setup = Setup(
        [Intent.CAREER, Intent.CAREER],
        knowledge_answers=[STUDIED, "Fünf Jahre."],
        rewrites=[standalone],
    )
    setup.bot.ask("Was hat Chris studiert?", IP, CONVERSATION)

    answer = setup.bot.ask("Wie lange hat das gedauert?", IP, CONVERSATION)

    assert answer.text == "Fünf Jahre."
    assert [call[-1]["content"] for call in setup.rewrite_model.calls] == [
        "Vorige Frage: Was hat Chris studiert?\n"
        f"Antwort des Chatbots: {STUDIED}\n"
        "Neue Frage: Wie lange hat das gedauert?"
    ]
    assert [call[-1]["content"] for call in setup.intent_model.calls][1:] == [standalone]
    assert [call[-1]["content"] for call in setup.knowledge_model.calls][1:] == [standalone]
    assert setup.store.read(cache_key(standalone, DAY)) is not None


def test_the_log_shows_the_rewritten_question_only_when_it_changed() -> None:
    setup = Setup(
        [Intent.CAREER, Intent.CAREER, Intent.CAREER],
        knowledge_answers=[STUDIED, "Fünf Jahre.", "Chris war bei Navigon."],
        rewrites=["Wie lange studierte Chris in Ilmenau?", "Wo arbeitete Chris danach?"],
    )
    setup.bot.ask("Was hat Chris studiert?", IP, CONVERSATION)

    setup.bot.ask("Wie lange?", IP, CONVERSATION)
    setup.bot.ask("Wo arbeitete Chris danach?", IP, CONVERSATION)

    assert setup.log.records[1].get("rewritten") == "Wie lange studierte Chris in Ilmenau?"
    assert "rewritten" not in setup.log.records[2]


def test_the_bot_remembers_the_standalone_question_and_its_answer() -> None:
    setup = Setup(
        [Intent.CAREER, Intent.CAREER],
        knowledge_answers=[STUDIED, "Fünf Jahre."],
        rewrites=["Wie lange studierte Chris in Ilmenau?"],
    )
    setup.bot.ask("Was hat Chris studiert?", IP, CONVERSATION)

    setup.bot.ask("Wie lange?", IP, CONVERSATION)

    remembered = setup.store.read(conversation_key(CONVERSATION))
    assert remembered == Exchange("Wie lange studierte Chris in Ilmenau?", "Fünf Jahre.").to_json()


def test_another_conversation_does_not_see_the_exchange() -> None:
    setup = Setup([Intent.CAREER, Intent.CAREER], knowledge_answers=[STUDIED, "Keine Ahnung."])
    setup.bot.ask("Was hat Chris studiert?", IP, CONVERSATION)

    setup.bot.ask("Wie lange hat das gedauert?", IP, "anderes-gespraech-0000")

    assert setup.rewrite_model.calls == []


def test_a_fixed_text_does_not_replace_the_last_exchange() -> None:
    # Nach „Das habe ich nicht verstanden.“ bezieht sich der Besucher weiter auf die Antwort davor.
    setup = Setup(
        [Intent.CAREER, Intent.GIBBERISH, Intent.CAREER],
        knowledge_answers=[STUDIED, "Fünf Jahre."],
        rewrites=["Wie lange asdf?", "Wie lange studierte Chris in Ilmenau?"],
    )
    setup.bot.ask("Was hat Chris studiert?", IP, CONVERSATION)
    setup.bot.ask("asdf", IP, CONVERSATION)

    setup.bot.ask("Wie lange?", IP, CONVERSATION)

    contents = [call[-1]["content"] for call in setup.rewrite_model.calls]
    assert ["Vorige Frage: Was hat Chris studiert?" in content for content in contents] == [
        True,
        True,
    ]


def test_a_clicked_suggestion_is_neither_rewritten_nor_gated_in_its_conversation() -> None:
    setup = Setup([Intent.CAREER], knowledge_answers=[FIELDS_REPLY, "Chris wurde angehalten."])
    setup.bot.ask("Was hat Chris bei Navigon gemacht?", IP, CONVERSATION)

    answer = setup.bot.ask("Was erlebte Chris mit der Polizei?", IP, CONVERSATION)

    assert answer.text == "Chris wurde angehalten."
    assert setup.rewrite_model.calls == []
    assert len(setup.intent_model.calls) == 1


def test_a_suggestion_from_another_conversation_goes_through_rewriter_and_gate() -> None:
    setup = Setup(
        [Intent.CAREER, Intent.CAREER, Intent.KNOWLEDGE],
        answers=["Allgemein."],
        knowledge_answers=[FIELDS_REPLY, STUDIED],
        rewrites=["Was erlebte Chris mit der Polizei?"],
    )
    setup.bot.ask("Was hat Chris bei Navigon gemacht?", IP, CONVERSATION)
    setup.bot.ask("Was hat Chris studiert?", IP, "anderes-gespraech-0000")

    answer = setup.bot.ask("Was erlebte Chris mit der Polizei?", IP, "anderes-gespraech-0000")

    assert answer.text == "Allgemein."


def test_suggestions_of_a_cached_answer_skip_the_gate_in_the_new_conversation() -> None:
    # Müsste die Frage durch Umschreiber und Türsteher, hielte er sie für Allgemeinwissen.
    setup = Setup(
        [Intent.CAREER, Intent.KNOWLEDGE],
        answers=["Allgemein."],
        knowledge_answers=[FIELDS_REPLY, "Chris wurde angehalten."],
        rewrites=["Was erlebte Chris mit der Polizei?"],
    )
    setup.bot.ask("Was hat Chris bei Navigon gemacht?", IP, CONVERSATION)
    setup.bot.ask("Was hat Chris bei Navigon gemacht?", IP, "anderes-gespraech-0000")

    answer = setup.bot.ask("Was erlebte Chris mit der Polizei?", IP, "anderes-gespraech-0000")

    assert (answer.text, len(setup.intent_model.calls)) == ("Chris wurde angehalten.", 1)


def test_a_clicked_suggestion_answered_today_comes_from_the_cache() -> None:
    setup = Setup(
        [Intent.CAREER, Intent.KNOWLEDGE],
        answers=["Allgemein."],
        knowledge_answers=[FIELDS_REPLY, "Chris wurde angehalten."],
        rewrites=["Was erlebte Chris mit der Polizei?"],
    )
    for conversation in (CONVERSATION, "anderes-gespraech-0000"):
        setup.bot.ask("Was hat Chris bei Navigon gemacht?", IP, conversation)
        setup.bot.ask("Was erlebte Chris mit der Polizei?", IP, conversation)

    assert [record["outcome"] for record in setup.log.records] == [
        "answered",
        "answered",
        "cache",
        "cache",
    ]
