from collections.abc import Mapping
from typing import Protocol


class Log(Protocol):
    def write(self, record: Mapping[str, object]) -> None: ...
