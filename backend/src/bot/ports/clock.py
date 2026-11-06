from datetime import date, datetime
from typing import Protocol


class Clock(Protocol):
    def today(self) -> date: ...

    def now(self) -> datetime: ...

    def seconds(self) -> float: ...
