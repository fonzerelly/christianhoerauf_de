from datetime import datetime

from bot.ports.clock import Clock
from bot.ports.language_model import LanguageModel, Message

# Eigene Namen statt `strftime`: die Sprache der Namen hinge sonst von der Locale des Lambdas ab.
WEEKDAYS = ("Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag")
MONTHS = (
    "Januar",
    "Februar",
    "März",
    "April",
    "Mai",
    "Juni",
    "Juli",
    "August",
    "September",
    "Oktober",
    "November",
    "Dezember",
)


def now_sentence(moment: datetime) -> str:
    """Der Satz mit Datum und Uhrzeit für den Prompt, etwa „Heute ist Donnerstag, der
    5. November 2026, es ist 14:30 Uhr.“ Ohne ihn kennt das Modell nur das Jahr seines Trainings."""
    weekday = WEEKDAYS[moment.weekday()]
    month = MONTHS[moment.month - 1]
    return (
        f"Heute ist {weekday}, der {moment.day}. {month} {moment.year}, "
        f"es ist {moment.hour}:{moment.minute:02d} Uhr."
    )


class GeneralAnswerer:
    """Beantwortet eine allgemeine Frage mit einem Modellaufruf und dem handgeschriebenen Prompt.
    Mit `clock` stehen hinter dem Prompt Datum und Uhrzeit (`now_sentence`), damit das Modell etwa
    ein Alter ausrechnen kann (Frage nach Linus Torvalds, 31.10.2026)."""

    def __init__(
        self, model: LanguageModel, system_prompt: str, clock: Clock | None = None
    ) -> None:
        self._model = model
        self._system_prompt = system_prompt
        self._clock = clock

    def answer(self, question: str) -> str:
        """Der rohe Antworttext des Modells (Länge und Emojis prüft später `check_reply`)."""
        system_prompt = self._system_prompt
        if self._clock is not None:
            system_prompt = f"{system_prompt.rstrip()}\n\n{now_sentence(self._clock.now())}"
        messages: list[Message] = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": question},
        ]
        return self._model.complete(messages)
