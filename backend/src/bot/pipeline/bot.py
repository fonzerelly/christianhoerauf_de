from dataclasses import dataclass
from datetime import date

from bot.domain.answer import Answer
from bot.domain.cost_protection import (
    cache_key,
    daily_counter_key,
    daily_limit_reached,
    visitor_counter_key,
    visitor_limit_reached,
    visitor_tag,
)
from bot.domain.fixed_answers import FixedAnswerKind, fixed_answer, intent_answer
from bot.domain.gimmick import gimmick_for
from bot.domain.intent import Intent
from bot.domain.language import Language, guess_language
from bot.domain.reaction import ReactionKind, reaction_for
from bot.domain.reply_check import check_reply
from bot.pipeline.general_answerer import GeneralAnswerer
from bot.pipeline.intent_classifier import IntentClassifier
from bot.ports.clock import Clock
from bot.ports.counter_store import CounterStore
from bot.ports.language_model import LanguageModelError
from bot.ports.log import Log


@dataclass(frozen=True)
class _Outcome:
    """Was aus einer Frage geworden ist; `intent` ist `None`, solange sie nicht bestimmt wurde."""

    answer: Answer
    name: str
    intent: Intent | None = None


class Bot:
    """Der Ablauf einer Frage (Plan, „Ablauf einer Frage“ und „Absichten neu“)."""

    def __init__(
        self,
        classifier: IntentClassifier,
        answerer: GeneralAnswerer,
        task_answerer: GeneralAnswerer,
        store: CounterStore,
        clock: Clock,
        log: Log,
        secret: str,
        cache_version: str = "",
        knowledge_answerer: GeneralAnswerer | None = None,
    ) -> None:
        self._classifier = classifier
        self._cache_version = cache_version
        self._answerers = {
            ReactionKind.GENERAL_ANSWER: answerer,
            ReactionKind.TASK_ANSWER: task_answerer,
        }
        # Ohne Texte der Wissensbasis gibt es keine Antwort aus ihr; die Absicht bekommt
        # dann ihren festen Text.
        if knowledge_answerer is not None:
            self._answerers[ReactionKind.KNOWLEDGE_BASE_ANSWER] = knowledge_answerer
        self._store = store
        self._clock = clock
        self._log = log
        self._secret = secret

    def ask(self, question: str, ip: str) -> Answer:
        """Beantwortet eine Frage und schreibt ein Protokoll (ohne echte IP, nur das Kürzel)."""
        started = self._clock.seconds()
        day = self._clock.today()
        tag = visitor_tag(ip, self._secret, day)
        outcome = self._decide(question, tag, day)
        self._log.write(
            {
                "question": question,
                "intent": outcome.intent.value if outcome.intent else None,
                "outcome": outcome.name,
                "answer": outcome.answer.text,
                "visitor": tag,
                "duration_ms": round((self._clock.seconds() - started) * 1000),
            }
        )
        return outcome.answer

    def _decide(self, question: str, tag: str, day: date) -> _Outcome:
        language = guess_language(question)
        # 1. Kostenschutz vor jedem Modellaufruf.
        if daily_limit_reached(self._store.increment(daily_counter_key(day))):
            return self._fixed(FixedAnswerKind.LIMIT_REACHED, language, "limit")
        # 2. Zwischenspeicher: gleiche Frage heute schon beantwortet.
        cached = self._store.read(cache_key(question, day, self._cache_version))
        if cached is not None:
            return _Outcome(Answer(text=cached), "cache")
        # 3. Absicht bestimmen.
        try:
            intent = self._classifier.classify(question)
        except LanguageModelError:
            return self._fixed(FixedAnswerKind.UNAVAILABLE, language, "unavailable")
        # 4. Reaktion: fester Text oder Gimmick ohne weiteren Modellaufruf, sonst das Modell.
        #    Ein Gimmick bringt seinen festen Text mit: für den Screenreader und für ein Frontend,
        #    das das Gimmick nicht kennt.
        reaction = reaction_for(intent)
        if reaction not in self._answerers:
            name = reaction if reaction is ReactionKind.GIMMICK else ReactionKind.FIXED_TEXT
            text = intent_answer(intent, language).text
            return _Outcome(Answer(text, gimmick_for(intent)), name.value, intent)
        return self._answer_with_model(question, tag, day, language, intent, reaction)

    def _answer_with_model(
        self,
        question: str,
        tag: str,
        day: date,
        language: Language,
        intent: Intent,
        reaction: ReactionKind,
    ) -> _Outcome:
        """Besuchergrenze, Antwort des Modells mit dem Prompt der Reaktion, Prüfung der Antwort,
        Zwischenspeicher."""
        if visitor_limit_reached(self._store.increment(visitor_counter_key(tag, day))):
            return self._fixed(
                FixedAnswerKind.VISITOR_LIMIT_REACHED, language, "visitor_limit", intent
            )
        try:
            reply = check_reply(self._answerers[reaction].answer(question))
        except LanguageModelError:
            reply = ""
        if not reply:
            return self._fixed(FixedAnswerKind.UNAVAILABLE, language, "unavailable", intent)
        self._store.write(cache_key(question, day, self._cache_version), reply)
        return _Outcome(Answer(text=reply), "answered", intent)

    @staticmethod
    def _fixed(
        kind: FixedAnswerKind, language: Language, name: str, intent: Intent | None = None
    ) -> _Outcome:
        return _Outcome(fixed_answer(kind, language), name, intent)
