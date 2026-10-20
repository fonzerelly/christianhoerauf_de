from datetime import date
from typing import Protocol


class Clock(Protocol):
    def today(self) -> date: ...

    def seconds(self) -> float: ...
