"""Antwort, Stichwort und Folgefragen aus der Ausgabe des Modells lesen und prüfen.

Die Regeln stehen in docs/backend/antwort-prompt/KRITERIEN.md (K12, K14, K15, K16, K28) und im
Plan „Stichwort und Folgefragen“ (Format, Q21). Was eine Prüfung nicht besteht, entfällt; die
Antwort selbst bleibt immer stehen. Der Bot benutzt das noch nicht, die Messung der Antworten schon.
"""

import re
from collections.abc import Sequence
from dataclasses import dataclass

NOT_YET_TEXTS = ("Darüber lerne ich gerade noch.", "I can answer that soon.")
CANNOT_HELP_TEXTS = (
    "Dabei kann ich leider nicht helfen.",
    "I'm afraid I can't help you with that.",
)
MAX_KEYWORD_LENGTH = 20
MAX_SUGGESTIONS = 3
MAX_SUGGESTION_LENGTH = 300

_MARKER = re.compile(r"^\[\[ ## (\w+) ## \]\]")
_LIST_MARKER = re.compile(r"^\s*(?:[-*•]|\d+[.)])\s*")
# Was die Schrift im Frontend darstellen kann (Zeichensatz im Frontend-Plan).
_DISPLAYABLE = re.compile(r"[A-Za-zÄÖÜäöüßÀ-ÿ0-9+\-.!?#²³]+")


@dataclass(frozen=True)
class AnswerFields:
    """Was der Besucher bekommt: die Antwort, dazu womöglich ein Stichwort und Folgefragen."""

    answer: str
    keyword: str | None = None
    suggestions: tuple[str, ...] = ()


def read_answer_fields(reply: str) -> AnswerFields:
    """Liest die Felder `antwort`, `stichwort` und `folgefragen` (eine Frage je Zeile).

    Fehlen alle Feldmarken, ist die ganze Ausgabe die Antwort. Fehlt ein Feld, entfällt nur dieses;
    fehlt das Feld `antwort`, ist der Text vor der ersten Feldmarke die Antwort."""
    fields = _split_fields(reply)
    if not fields:
        return AnswerFields(reply.strip())
    keyword = fields.get("stichwort", "").strip() or None
    suggestions = tuple(
        _LIST_MARKER.sub("", line).strip()
        for line in fields.get("folgefragen", "").splitlines()
        if line.strip()
    )
    return AnswerFields(fields.get("antwort", fields[""]).strip(), keyword, suggestions)


def _split_fields(reply: str) -> dict[str, str]:
    """Text je Feldname, bis zur nächsten Feldmarke; unter "" der Text vor der ersten Marke.
    Ohne jede Feldmarke ein leeres Dict."""
    fields: dict[str, list[str]] = {"": []}
    current = ""
    for line in reply.splitlines():
        marker = _MARKER.match(line.strip())
        if marker:
            current = marker.group(1)
            fields[current] = []
        else:
            fields[current].append(line)
    if len(fields) == 1:
        return {}
    return {name: "\n".join(lines) for name, lines in fields.items()}


def is_fixed_text(answer: str) -> bool:
    """Ob die Antwort einer der festen Texte ist („Darüber lerne ich gerade noch.“, „Dabei kann
    ich leider nicht helfen.“, je deutsch oder englisch)."""
    return answer.strip() in NOT_YET_TEXTS + CANNOT_HELP_TEXTS


def keyword_problem(keyword: str, answer: str, question: str) -> str | None:
    """Warum das Stichwort nicht taugt (K12, K14), oder `None`, wenn es taugt."""
    if " " in keyword.strip():
        return "mehr als ein Wort"
    if len(keyword) > MAX_KEYWORD_LENGTH:
        return f"länger als {MAX_KEYWORD_LENGTH} Zeichen"
    if keyword.lower() == "chris":
        return "ist „Chris“"
    if not _DISPLAYABLE.fullmatch(keyword):
        return "nicht darstellbar"
    if not contains_word(answer, keyword):
        return "steht nicht in der Antwort"
    if contains_word(question, keyword):
        return "steht schon in der Frage"
    return None


def suggestion_problem(suggestion: str, earlier: Sequence[str]) -> str | None:
    """Warum die Folgefrage nicht taugt (K15, K16), oder `None`. `earlier` sind die Folgefragen
    davor, die bestanden haben."""
    if not suggestion.endswith("?"):
        return "endet nicht mit „?“"
    if not contains_word(suggestion, "Chris"):
        return "nennt „Chris“ nicht"
    if len(suggestion) > MAX_SUGGESTION_LENGTH:
        return f"länger als {MAX_SUGGESTION_LENGTH} Zeichen"
    if suggestion.lower() in (other.lower() for other in earlier):
        return "doppelt"
    return None


def checked_answer_fields(fields: AnswerFields, question: str) -> AnswerFields:
    """Behält vom Stichwort und von den Folgefragen nur, was die Prüfungen besteht, höchstens drei
    Folgefragen. Bei einem festen Text bleibt nur die Antwort (K28)."""
    if is_fixed_text(fields.answer):
        return AnswerFields(fields.answer)
    keyword = fields.keyword
    if keyword is not None and keyword_problem(keyword, fields.answer, question):
        keyword = None
    kept: list[str] = []
    for suggestion in fields.suggestions:
        if len(kept) < MAX_SUGGESTIONS and suggestion_problem(suggestion, kept) is None:
            kept.append(suggestion)
    return AnswerFields(fields.answer, keyword, tuple(kept))


def contains_word(text: str, word: str) -> bool:
    """Ob `word` als eigenes Wort in `text` steht, ohne Rücksicht auf Groß- und Kleinschreibung.
    „Chris“ steht also nicht in „ChrisBot“ und „Lager“ nicht in „Lager-Software“."""
    letters = r"\wÄÖÜäöüß\-"
    pattern = rf"(?<![{letters}]){re.escape(word)}(?![{letters}])"
    return re.search(pattern, text, re.IGNORECASE) is not None
