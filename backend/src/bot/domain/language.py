import re
from typing import Literal

Language = Literal["de", "en"]

_GERMAN_WORDS = {
    "der", "die", "das", "und", "ist", "was", "wie", "wer", "wo", "wann", "warum", "ein", "eine",
    "nicht", "ich", "du", "hat", "von", "mit", "für", "auf", "wieviel", "viele", "welche",
}  # fmt: skip
_ENGLISH_WORDS = {
    "the", "and", "is", "what", "how", "who", "where", "when", "why", "a", "an", "not", "i",
    "you", "has", "of", "with", "for", "on", "much", "many", "which", "are", "does", "do",
}  # fmt: skip


def guess_language(text: str) -> Language:
    """Rät Deutsch oder Englisch; Umlaut, mehr deutsche Füllwörter oder Gleichstand: Deutsch."""
    if re.search("[äöüß]", text.lower()):
        return "de"
    words = re.findall(r"[a-zäöüß]+", text.lower())
    german = sum(word in _GERMAN_WORDS for word in words)
    english = sum(word in _ENGLISH_WORDS for word in words)
    return "en" if english > german else "de"
