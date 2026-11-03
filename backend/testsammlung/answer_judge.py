"""Der Richter: Qwen beantwortet je Kriterium eine enge Ja/Nein-Frage (KRITERIEN.md).

K17 und K24 sieht er nur mit der Folgefrage, wie ein Besucher, der sie anklickt, ohne die Antwort
gelesen zu haben. Beide Prompts sind an Christians Urteilen über 90 Folgefragen geeicht
(docs/backend/antwort-prompt/eichung_richter.json, 03.11.2026: K17 81 von 85, K24 85 von 90 gleich;
einige Beispiele im Prompt stammen aus diesen Fragen). Die Prompts stehen in `richter/k17.md` und
`richter/k24.md`; nicht ohne neue Eichung ändern.

Alle anderen Prüffragen bekommt er mit den Texten der Wissensbasis **vorn** in der
Systemnachricht: So bleibt der lange gleiche Anfang im Zwischenspeicher von LM Studio, und ein
Urteil dauert etwa 2 s statt 27 s.
"""

import re
from collections.abc import Sequence
from pathlib import Path

import yaml

from bot.pipeline.answer_fields import AnswerFields
from bot.ports.language_model import LanguageModel, Message
from testsammlung.answer_score import Finding

_PROMPTS = Path(__file__).parent / "richter"


def _load(name: str) -> str:
    return (_PROMPTS / name).read_text(encoding="utf-8").rstrip("\n")


K17_PROMPT = _load("k17.md")
K24_PROMPT = _load("k24.md")
_TASK = _load("aufgabe.md")

Check = tuple[str, bool, str]


def _checks(part: str) -> tuple[Check, ...]:
    """(Kriterium, muss, Prüffrage) aus `richter/pruefungen.yaml`, Teil `antwort` oder
    `folgefrage`."""
    entries = yaml.safe_load((_PROMPTS / "pruefungen.yaml").read_text(encoding="utf-8"))[part]
    return tuple((entry["kriterium"], entry["muss"], entry["frage"]) for entry in entries)


ANSWER_CHECKS = _checks("antwort")
SUGGESTION_CHECKS = _checks("folgefrage")

_VERDICT = re.compile(r"URTEIL:\s*\**\s*(JA|NEIN)", re.IGNORECASE)
_REASON = re.compile(r"GRUND:\s*(.*)", re.IGNORECASE)
_VERDICT_LINE = re.compile(
    r"^\W*(K\d+)\W*:[ \t]*\**[ \t]*(JA|NEIN)\b\**[ \t]*[-–—:]?[ \t]*(.*)$",
    re.IGNORECASE | re.MULTILINE,
)


def read_verdict(reply: str) -> tuple[bool | None, str]:
    """Liest „URTEIL: JA/NEIN“ und „GRUND: …“. Ohne Urteil `None` und die ganze Antwort."""
    verdict = _VERDICT.search(reply)
    if verdict is None:
        return None, reply.strip()
    reason = _REASON.search(reply)
    return verdict.group(1).upper() == "JA", reason.group(1).strip() if reason else ""


def read_verdicts(reply: str) -> dict[str, tuple[bool, str]]:
    """Liest Zeilen „K1: JA – Grund“: je Kriterium bestanden und Grund. Andere Zeilen zählen
    nicht."""
    return {
        line.group(1).upper(): (line.group(2).upper() == "JA", line.group(3).strip())
        for line in _VERDICT_LINE.finditer(reply)
    }


class Judge:
    """Fragt den Richter (`model`, Qwen) zu einer Antwort; `knowledge` sind die Texte der
    Wissensbasis, wie der Bot sie bekommt."""

    def __init__(self, model: LanguageModel, knowledge: str) -> None:
        self._model = model
        self._knowledge_head = f"Texte über Chris:\n\n{knowledge}\n\n"

    def suggestion_alone(self, suggestion: str) -> list[Finding]:
        """K17 und K24: je ein Aufruf mit dem geeichten Prompt, nur mit der Folgefrage."""
        findings = []
        for criterion, prompt in (("K17", K17_PROMPT), ("K24", K24_PROMPT)):
            reply = self._model.complete(
                [
                    {"role": "system", "content": prompt},
                    {"role": "user", "content": f"Frage: {suggestion}"},
                ]
            )
            passed, reason = read_verdict(reply)
            findings.append(
                Finding(criterion, True, passed is not False, f"„{suggestion}“: {reason}")
            )
        return findings

    def answer(self, question: str, fields: AnswerFields) -> list[Finding]:
        """Die Prüffragen zur Antwort (`ANSWER_CHECKS`) in einem Aufruf."""
        case = (
            f"Frage des Besuchers: {question}\n"
            f"Antwort: {fields.answer}\n"
            f"Stichwort: {fields.keyword or '(keins)'}"
        )
        return self._checks(ANSWER_CHECKS, "die Antwort und das Stichwort", case, "")

    def suggestion(self, question: str, fields: AnswerFields, suggestion: str) -> list[Finding]:
        """Die Prüffragen zu einer Folgefrage (`SUGGESTION_CHECKS`) in einem Aufruf, mit Antwort
        und den anderen Folgefragen derselben Antwort."""
        others = [other for other in fields.suggestions if other != suggestion]
        case = (
            f"Frage des Besuchers: {question}\n"
            f"Antwort: {fields.answer}\n"
            f"Andere Folgefragen: {' | '.join(others) or '(keine)'}\n"
            f"Zu prüfende Folgefrage: {suggestion}"
        )
        return self._checks(
            SUGGESTION_CHECKS, "eine der vorgeschlagenen Folgefragen", case, f"„{suggestion}“: "
        )

    def _checks(
        self, checks: Sequence[Check], what: str, case: str, note_prefix: str
    ) -> list[Finding]:
        task = _TASK.format(
            was=what,
            fragen="\n".join(f"{criterion}: {text}" for criterion, _, text in checks),
            format="\n".join(
                f"{criterion}: JA oder NEIN – ein kurzer Grund" for criterion, _, _ in checks
            ),
        )
        messages: list[Message] = [
            {"role": "system", "content": self._knowledge_head + task},
            {"role": "user", "content": case},
        ]
        verdicts = read_verdicts(self._model.complete(messages))
        findings = []
        for criterion, must, _ in checks:
            if criterion not in verdicts:
                findings.append(Finding("Richter", False, False, f"kein Urteil zu {criterion}"))
                continue
            passed, reason = verdicts[criterion]
            findings.append(Finding(criterion, must, passed, note_prefix + reason))
        return findings
