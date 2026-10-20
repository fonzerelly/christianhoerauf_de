import json
from collections.abc import Callable, Mapping


class JsonLog:
    """Protokoll als eine JSON-Zeile je Eintrag. Lambda leitet die Standardausgabe nach
    CloudWatch; `emit` lässt sich in Tests ersetzen."""

    def __init__(self, emit: Callable[[str], None] = print) -> None:
        self._emit = emit

    def write(self, record: Mapping[str, object]) -> None:
        self._emit(json.dumps(record, ensure_ascii=False))
