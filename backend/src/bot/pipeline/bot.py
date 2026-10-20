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
from bot.domain.fixed_answers import FixedAnswerKind, fixed_answer
from bot.domain.intent import Intent
from bot.domain.language import Language, guess_language
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
    """Der Ablauf einer Frage (Plan, „Ablauf einer Frage“) für Stufe 1."""

    def __init__(
        self,
        classifier: IntentClassifier,
        answerer: GeneralAnswerer,
        store: CounterStore,
        clock: Clock,
        log: Log,
        secret: str,
    ) -> None:
        self._classifier = classifier
        self._answerer = answerer
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
        cached = self._store.read(cache_key(question, day))
        if cached is not None:
            return _Outcome(Answer(text=cached), "cache")
        # 3. Absicht, 4. je nach Absicht.
        try:
            intent = self._classifier.classify(question)
            if intent is Intent.ABOUT_CHRISTIAN:
                return self._fixed(
                    FixedAnswerKind.ABOUT_CHRISTIAN, language, "about_christian", intent
                )
            if intent is Intent.DISALLOWED:
                return self._fixed(FixedAnswerKind.DISALLOWED, language, "disallowed", intent)
            return self._answer_general(question, tag, day, language, intent)
        except LanguageModelError:
            return self._fixed(FixedAnswerKind.UNAVAILABLE, language, "unavailable")

    def _answer_general(
        self, question: str, tag: str, day: date, language: Language, intent: Intent
    ) -> _Outcome:
        """Allgemeine Frage (und, bis es Gimmicks gibt, Gimmick-Frage): Besuchergrenze, Modell,
        Prüfung der Antwort, Zwischenspeicher."""
        if visitor_limit_reached(self._store.increment(visitor_counter_key(tag, day))):
            return self._fixed(
                FixedAnswerKind.VISITOR_LIMIT_REACHED, language, "visitor_limit", intent
            )
        reply = check_reply(self._answerer.answer(question))
        if not reply:
            return self._fixed(FixedAnswerKind.UNAVAILABLE, language, "unavailable", intent)
        self._store.write(cache_key(question, day), reply)
        return _Outcome(Answer(text=reply), "answered", intent)

    @staticmethod
    def _fixed(
        kind: FixedAnswerKind, language: Language, name: str, intent: Intent | None = None
    ) -> _Outcome:
        return _Outcome(fixed_answer(kind, language), name, intent)
