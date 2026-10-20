import time
from datetime import UTC, date, datetime


class SystemClock:
    def today(self) -> date:
        """Das heutige Datum in UTC (damit der Tageswechsel überall gleich ist)."""
        return datetime.now(UTC).date()

    def seconds(self) -> float:
        """Monotone Sekunden, nur zum Messen von Dauern."""
        return time.monotonic()
