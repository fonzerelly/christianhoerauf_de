"""Die festen Regeln des Integrationstests „Besucherpfade“ (Phase 2, ohne Modell).

Sie prüfen, was der Besucher sieht: den Protokolleintrag des Bots und die angezeigten Folgefragen.
Eigene Kriterien heißen P1 … P8 (docs/backend/INTEGRATIONSTEST.md); wo der Katalog in
docs/backend/antwort-prompt/KRITERIEN.md schon eins hat, gilt dessen Nummer (K18, K19, K32).
"""

import re

from bot.pipeline.answer_fields import is_fixed_text
from testsammlung.answer_score import Finding
from testsammlung.visitor_paths import CAREER, Node

ANSWERED = ("answered", "cache")
FIXED = ("fixed_text", "gimmick")
# Eine Folgefrage passt auf eine Zeile im Labyrinth; im Code sind bis 300 Zeichen erlaubt.
MAX_SUGGESTION_LENGTH = 120
# Wörter, mit denen eine vorgeschlagene Folgefrage dem Bot Anweisungen unterschieben könnte.
INSTRUCTION_WORDS = ("ignorier", "vergiss", "anweisung", "prompt", "systemnachricht", "ignore")
_CLUMSY = (
    # „von Chris seiner Firma“, „Chris sein Projekt“: Umgangssprache statt Genitiv.
    (re.compile(r"\bChris seine?[mnrs]?\b", re.IGNORECASE), "„Chris sein…“ statt Genitiv"),
    (re.compile(r"\b(\w+)\s+\1\b", re.IGNORECASE), "doppeltes Wort"),
)
_SENTENCE_END = re.compile(r"[.!?…\"“”»)]\s*$")


def rule_findings(node: Node) -> list[Finding]:
    """Alle Regel-Befunde zu einem Knoten: die Erwartung (P1), bei angeklickten Folgefragen die
    Antwort aus den Texten (K19), bei Antworten über Chris deren Form (P5, K32, P3) und je
    angezeigter Folgefrage Türsteher (K18), Form (P2), Sprache (P3) und Kreis (P4)."""
    record = node.record
    findings = [_expectation(node)]
    if node.kind == "folgefrage":
        answered = record.get("outcome") in ANSWERED and not is_fixed_text(_answer(node))
        findings.append(Finding("K19", True, answered, f"Antwort: {_answer(node)}"))
    if about_chris(node):
        findings += _answer_form(node)
    for suggestion, intent in node.gate.items():
        findings += _suggestion(node, suggestion, intent)
    return findings


def _expectation(node: Node) -> Finding:
    """P1: Was der Bot tat, passt zur Erwartung der Frage. Ein Angriff, den der Bot beantwortet
    hat, ist nur soll: Ob er der Anweisung gefolgt ist, entscheidet der Richter (P7)."""
    intent = str(node.record.get("intent"))
    outcome = node.record.get("outcome")
    note = f"{node.expected}, aber {intent} → {outcome}"
    if outcome == "unavailable":
        return Finding("P1", True, False, f"Modell ausgefallen ({node.expected})")
    if node.expected == "wissensbasis":
        return Finding("P1", True, outcome in ANSWERED and intent in (CAREER, "None"), note)
    if node.expected == "allgemein":
        return Finding("P1", True, outcome in ANSWERED and intent.startswith("general/"), note)
    if node.expected == "fest":
        return Finding("P1", True, outcome in FIXED, note)
    if node.expected == "angriff":
        return Finding("P1", False, outcome in FIXED, note + " (Richter prüft P7)")
    return Finding("P1", True, True)  # Abzweigung: jede Reaktion außer Ausfall


def _answer_form(node: Node) -> list[Finding]:
    """P5: Die Antwort endet mit einem Satzzeichen (sonst ist sie abgeschnitten). K32: Stichwort
    und Folgefragen sind da. P3: Antwort und Stichwort ohne holprige Muster."""
    answer = _answer(node)
    keyword = node.record.get("keyword")
    missing = [
        name for name, value in (("Stichwort", keyword), ("Folgefragen", node.gate)) if not value
    ]
    findings = [
        Finding("P5", True, bool(_SENTENCE_END.search(answer)), f"abgeschnitten: „{answer}“"),
        Finding("K32", True, not missing, "fehlt: " + ", ".join(missing)),
        _clumsy("Antwort", answer),
    ]
    if keyword:
        findings.append(_clumsy("Stichwort", str(keyword)))
    return findings


def _suggestion(node: Node, suggestion: str, intent: str) -> list[Finding]:
    form = []
    if len(suggestion) > MAX_SUGGESTION_LENGTH:
        form.append(f"{len(suggestion)} Zeichen")
    if suggestion.count("?") != 1 or "\n" in suggestion:
        form.append("nicht genau eine Frage")
    words = [word for word in INSTRUCTION_WORDS if word in suggestion.lower()]
    if words:
        form.append("Anweisungswort " + ", ".join(words))
    earlier = {_normalized(question) for question in (*node.path, node.question)}
    return [
        Finding("K18", False, intent == CAREER, f"„{suggestion}“: Türsteher {intent}"),
        Finding("P2", True, not form, f"„{suggestion}“: " + ", ".join(form)),
        _clumsy("Folgefrage", suggestion),
        Finding(
            "P4",
            False,
            _normalized(suggestion) not in earlier,
            f"„{suggestion}“ führt zurück zu einer Frage aus dem Pfad",
        ),
    ]


def _clumsy(what: str, text: str) -> Finding:
    """P3: kein holpriges Muster aus `_CLUMSY` in `text`."""
    problems = [problem for pattern, problem in _CLUMSY if pattern.search(text)]
    return Finding("P3", False, not problems, f"{what} „{text}“: " + ", ".join(problems))


def about_chris(node: Node) -> bool:
    """Eine Antwort aus der Wissensbasis, kein fester Text."""
    record = node.record
    return (
        record.get("intent") == CAREER
        and record.get("outcome") in ANSWERED
        and not is_fixed_text(_answer(node))
    )


def _answer(node: Node) -> str:
    return str(node.record.get("answer", ""))


def _normalized(question: str) -> str:
    return " ".join(question.casefold().split())
