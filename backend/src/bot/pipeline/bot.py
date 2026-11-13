import json
from dataclasses import dataclass, replace
from datetime import date

from bot.domain.answer import Answer
from bot.domain.cost_protection import (
    cache_key,
    conversation_key,
    daily_counter_key,
    daily_limit_reached,
    suggestion_key,
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
from bot.pipeline.answer_fields import checked_answer_fields, read_answer_fields
from bot.pipeline.general_answerer import GeneralAnswerer
from bot.pipeline.intent_classifier import IntentClassifier
from bot.pipeline.question_rewriter import Exchange, QuestionRewriter
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
    # Die Frage ist eine Folgefrage, die der Bot heute selbst vorgeschlagen hat.
    suggested: bool = False
    # Die Frage, wie der Bot sie beantwortet hat: mit dem Verlauf umgeschrieben (ADR 0005), sonst
    # `None` für „wie gestellt“.
    rewritten: str | None = None


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
        rewriter: QuestionRewriter | None = None,
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
        self._rewriter = rewriter
        self._store = store
        self._clock = clock
        self._log = log
        self._secret = secret

    def ask(self, question: str, ip: str, conversation: str | None = None) -> Answer:
        """Beantwortet eine Frage und schreibt ein Protokoll (ohne echte IP, nur das Kürzel).
        Mit `conversation` (Gesprächs-ID, ADR 0005) merkt sich der Bot die letzte beantwortete
        Frage und Antwort des Gesprächs und schreibt die nächste Frage damit eigenständig um."""
        started = self._clock.seconds()
        day = self._clock.today()
        tag = visitor_tag(ip, self._secret, day)
        # Folgefragen gelten nur im Gespräch, in dem sie vorgeschlagen wurden; ohne Gesprächs-ID
        # nur für denselben Besucher.
        scope = conversation or tag
        outcome = self._decide(question, tag, scope, day, conversation)
        self._remember(outcome, question, scope, day, conversation)
        record: dict[str, object] = {
            "question": question,
            "intent": outcome.intent.value if outcome.intent else None,
            "outcome": outcome.name,
            "answer": outcome.answer.text,
            "visitor": tag,
            "duration_ms": round((self._clock.seconds() - started) * 1000),
        }
        # Stichwort und Folgefragen nur, wenn es sie gibt (Antworten aus der Wissensbasis).
        if outcome.answer.keyword is not None:
            record["keyword"] = outcome.answer.keyword
        if outcome.answer.suggestions:
            record["suggestions"] = list(outcome.answer.suggestions)
        if outcome.suggested:
            record["suggested"] = True
        if outcome.rewritten is not None:
            record["rewritten"] = outcome.rewritten
        self._log.write(record)
        return outcome.answer

    def _remember(
        self, outcome: _Outcome, question: str, scope: str, day: date, conversation: str | None
    ) -> None:
        """Nach einer Antwort des Modells, ob neu oder aus dem Zwischenspeicher: ihre Folgefragen,
        damit sie beim Anklicken in diesem Gespräch nicht am Türsteher scheitern, und mit
        Gesprächs-ID die Frage (eigenständig) und die Antwort für die nächste Frage. Feste Texte
        lassen den letzten Austausch stehen: Nach „Das habe ich nicht verstanden.“ bezieht sich der
        Besucher weiter auf die Antwort davor."""
        if outcome.name not in ("answered", "cache"):
            return
        for suggestion in outcome.answer.suggestions:
            self._store.write(suggestion_key(suggestion, day, scope), "1")
        if conversation is not None:
            exchange = Exchange(outcome.rewritten or question, outcome.answer.text)
            self._store.write(conversation_key(conversation), exchange.to_json())

    def _decide(
        self, question: str, tag: str, scope: str, day: date, conversation: str | None
    ) -> _Outcome:
        language = guess_language(question)
        # 1. Kostenschutz vor jedem Modellaufruf.
        if daily_limit_reached(self._store.increment(daily_counter_key(day))):
            return self._fixed(FixedAnswerKind.LIMIT_REACHED, language, "limit")
        # 2. Eine Folgefrage, die der Bot heute in diesem Gespräch selbst vorgeschlagen hat, steht
        #    für sich und gehört zur Laufbahn: kein Umschreiben, kein Türsteher. Er stufte manche
        #    falsch ein (Messung 07.11.2026).
        if self._store.read(suggestion_key(question, day, scope)) is not None:
            cached = self._cached(question, day)
            if cached is not None:
                return cached
            outcome = self._react(question, tag, day, language, Intent.CAREER)
            return replace(outcome, suggested=True)
        # 3. Mit dem Verlauf eigenständig machen (ADR 0005). Ab hier gilt die umgeschriebene Frage.
        asked = question
        question = self._standalone(question, conversation)
        rewritten = question if question != asked else None
        # 4. Zwischenspeicher: gleiche Frage heute schon beantwortet.
        cached = self._cached(question, day)
        if cached is not None:
            return replace(cached, rewritten=rewritten)
        # 5. Absicht bestimmen.
        try:
            intent = self._classifier.classify(question)
        except LanguageModelError:
            return self._fixed(FixedAnswerKind.UNAVAILABLE, language, "unavailable")
        outcome = self._react(question, tag, day, language, intent)
        return replace(outcome, rewritten=rewritten)

    def _cached(self, question: str, day: date) -> _Outcome | None:
        """Die heute schon gegebene Antwort auf diese Frage, sonst `None`."""
        cached = self._store.read(cache_key(question, day, self._cache_version))
        if cached is None:
            return None
        return _Outcome(Answer.from_dict(json.loads(cached)), "cache")

    def _standalone(self, question: str, conversation: str | None) -> str:
        """Die Frage, mit dem letzten Austausch des Gesprächs umgeschrieben; ohne Gespräch, ohne
        Austausch oder ohne Umschreiber unverändert."""
        if conversation is None or self._rewriter is None:
            return question
        remembered = self._store.read(conversation_key(conversation))
        if remembered is None:
            return question
        return self._rewriter.rewrite(question, Exchange.from_json(remembered))

    def _react(
        self, question: str, tag: str, day: date, language: Language, intent: Intent
    ) -> _Outcome:
        """Letzter Schritt von `_decide`: die Reaktion auf die Absicht."""
        # Reaktion: fester Text oder Gimmick ohne weiteren Modellaufruf, sonst das Modell.
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
            answer = self._checked_answer(self._answerers[reaction].answer(question), reaction)
        except LanguageModelError:
            answer = Answer(text="")
        if not answer.text:
            return self._fixed(FixedAnswerKind.UNAVAILABLE, language, "unavailable", intent)
        # Die allgemeine Antwort kennt die Uhrzeit und veraltet deshalb; sie ist kurz und billig.
        if reaction is not ReactionKind.GENERAL_ANSWER:
            key = cache_key(question, day, self._cache_version)
            self._store.write(key, json.dumps(answer.to_dict(), ensure_ascii=False))
        return _Outcome(answer, "answered", intent)

    @staticmethod
    def _checked_answer(reply: str, reaction: ReactionKind) -> Answer:
        """Die geprüfte Antwort des Modells. Aus der Wissensbasis kommt sie in Feldern (Antwort,
        Stichwort, Folgefragen); was deren Prüfungen nicht besteht, entfällt. Den Text prüft immer
        `check_reply`."""
        if reaction is not ReactionKind.KNOWLEDGE_BASE_ANSWER:
            return Answer(text=check_reply(reply))
        fields = checked_answer_fields(read_answer_fields(reply))
        return Answer(
            text=check_reply(fields.answer),
            keyword=fields.keyword,
            suggestions=fields.suggestions,
        )

    @staticmethod
    def _fixed(
        kind: FixedAnswerKind, language: Language, name: str, intent: Intent | None = None
    ) -> _Outcome:
        return _Outcome(fixed_answer(kind, language), name, intent)
