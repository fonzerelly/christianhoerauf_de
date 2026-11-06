import time
from datetime import UTC, date, datetime
from zoneinfo import ZoneInfo

# Die Besucher sind fast alle in Deutschland; Sommer- und Winterzeit kommen aus `tzdata`.
GERMAN_TIME = ZoneInfo("Europe/Berlin")


class SystemClock:
    def today(self) -> date:
        """Das heutige Datum in UTC (damit der Tageswechsel überall gleich ist)."""
        return datetime.now(UTC).date()

    def now(self) -> datetime:
        """Datum und Uhrzeit jetzt in deutscher Zeit, für den Prompt der allgemeinen Antwort."""
        return datetime.now(GERMAN_TIME)

    def seconds(self) -> float:
        """Monotone Sekunden, nur zum Messen von Dauern."""
        return time.monotonic()
