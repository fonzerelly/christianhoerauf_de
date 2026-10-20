from typing import Protocol


class CounterStore(Protocol):
    """Gemeinsamer Speicher für Zähler und Zwischenspeicher (ADR backend/0003). Einträge
    verfallen von selbst."""

    def increment(self, key: str) -> int: ...

    def read(self, key: str) -> str | None: ...

    def write(self, key: str, value: str) -> None: ...
