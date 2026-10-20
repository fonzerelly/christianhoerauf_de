from collections import Counter


class MemoryStore:
    """Speicher im Arbeitsspeicher für Tests und lokale Läufe; vergisst nichts, verfällt nichts."""

    def __init__(self) -> None:
        self._counters: Counter[str] = Counter()
        self._texts: dict[str, str] = {}

    def increment(self, key: str) -> int:
        self._counters[key] += 1
        return self._counters[key]

    def read(self, key: str) -> str | None:
        return self._texts.get(key)

    def write(self, key: str, value: str) -> None:
        self._texts[key] = value
