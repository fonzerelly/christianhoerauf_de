from collections.abc import Sequence
from typing import Protocol, TypedDict


class Message(TypedDict):
    role: str
    content: str


class LanguageModelError(Exception):
    pass


class LanguageModel(Protocol):
    def complete(self, messages: Sequence[Message]) -> str: ...
