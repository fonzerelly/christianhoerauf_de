"""Antwort, Stichwort und Folgefragen aus der Ausgabe des Modells lesen und prüfen.

Die Regeln stehen in docs/backend/antwort-prompt/KRITERIEN.md (K12, K15, K16, K28) und im
Plan „Stichwort und Folgefragen“ (Format, Q21). Was eine Prüfung nicht besteht, entfällt; die
Antwort selbst bleibt immer stehen. Der Bot (Antworten aus der Wissensbasis, seit 07.11.2026) und
die Messung der Antworten benutzen dieselben Prüfungen.
"""

import re
from collections.abc import Sequence
from dataclasses import dataclass

NOT_YET_TEXTS = ("Darüber lerne ich gerade noch.", "I can answer that soon.")
CANNOT_HELP_TEXTS = (
    "Dabei kann ich leider nicht helfen.",
    "I'm afraid I can't help you with that.",
)
# Das Stichwort ist eine kurze Überschrift (06.11.2026): bis zu zwei Wörter; was im Labyrinth nicht
# in eine Zeile passt, kürzt das Frontend.
MAX_KEYWORD_WORDS = 2
MAX_KEYWORD_LENGTH = 24
MAX_SUGGESTIONS = 3
# Eine angeklickte Folgefrage umgeht den Türsteher. Damit niemand dem Bot über sie eine Anweisung
# unterschiebt, ist sie kurz und ohne Anweisungswörter (Plan, „Folgefragen-Lücke“, 13.11.2026).
# Echte Folgefragen waren im Integrationstest höchstens 103 Zeichen lang.
MAX_SUGGESTION_LENGTH = 120
INSTRUCTION_WORDS = ("ignorier", "vergiss", "anweisung", "prompt", "systemnachricht", "ignore")

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


def keyword_problem(keyword: str) -> str | None:
    """Warum das Stichwort nicht taugt (K12), oder `None`, wenn es taugt. Seit 06.11.2026 eine kurze
    Überschrift, die nicht wörtlich in der Antwort stehen muss; ob sie zur Antwort passt, prüft der
    Richter (K13, K33)."""
    words = keyword.split()
    if len(words) > MAX_KEYWORD_WORDS:
        return "mehr als zwei Wörter"
    if len(keyword) > MAX_KEYWORD_LENGTH:
        return f"länger als {MAX_KEYWORD_LENGTH} Zeichen"
    if contains_word(keyword, "Chris"):
        return "enthält „Chris“"
    if not all(_DISPLAYABLE.fullmatch(word) for word in words):
        return "nicht darstellbar"
    return None


def suggestion_problem(suggestion: str, earlier: Sequence[str]) -> str | None:
    """Warum die Folgefrage nicht taugt (K15, K16, Form gegen untergeschobene Anweisungen), oder
    `None`. `earlier` sind die Folgefragen davor, die bestanden haben. Ein zweites „?“ ist erlaubt:
    Ein Projekt heißt „Wer war's?“."""
    if not suggestion.endswith("?"):
        return "endet nicht mit „?“"
    if not contains_word(suggestion, "Chris"):
        return "nennt „Chris“ nicht"
    if len(suggestion) > MAX_SUGGESTION_LENGTH:
        return f"länger als {MAX_SUGGESTION_LENGTH} Zeichen"
    for word in INSTRUCTION_WORDS:
        if word in suggestion.lower():
            return f"Anweisungswort „{word}“"
    if suggestion.lower() in (other.lower() for other in earlier):
        return "doppelt"
    return None


def checked_answer_fields(fields: AnswerFields) -> AnswerFields:
    """Behält vom Stichwort und von den Folgefragen nur, was die Prüfungen besteht, höchstens drei
    Folgefragen. Bei einem festen Text bleibt nur die Antwort (K28)."""
    if is_fixed_text(fields.answer):
        return AnswerFields(fields.answer)
    keyword = fields.keyword
    if keyword is not None and keyword_problem(keyword):
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
