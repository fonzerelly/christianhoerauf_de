"""Aufzeichnen für den Integrationstest „Besucherpfade“ (docs/backend/INTEGRATIONSTEST.md).

Jede Persona stellt ihre Einstiegsfragen; der Erkunder klickt die Folgefragen in die Breite bis
zur gewählten Tiefe und lässt den Besucher nach Antworten über Chris eigene Rückfragen stellen
(Abzweigungen). Jede Frage wird nur einmal gestellt, jede von einem neuen Besucher. Bot,
Türsteher und Besucher kommen als Funktionen herein: Hier wird nur aufgezeichnet, bewertet wird
später (`visitor_review.py`), damit Gemma und der Richter nicht zugleich geladen sein müssen.
"""

import json
from collections.abc import Callable, Iterable, Iterator, Mapping, Sequence
from dataclasses import dataclass
from pathlib import Path

from testsammlung.visitor_scenarios import Persona

# Fragt den Bot (Frage, Besucher, Besucher der Elternfrage oder `None`) und gibt seinen
# Protokolleintrag zurück.
Ask = Callable[[str, str, str | None], Mapping[str, object]]
# Die Absicht, die der Türsteher einer Frage gibt, als Kürzel („christian/career“).
Classify = Callable[[str], str]
# Die Rückfragen, die ein Besucher nach (Frage, Antwort) stellen würde.
Invent = Callable[[str, str], list[str]]


@dataclass(frozen=True)
class Node:
    """Eine gestellte Frage im Pfad einer Persona.

    `kind`: start, folgefrage (angeklickt) oder abzweigung (eigene Rückfrage des Besuchers).
    `expected`: die Erwartung der Einstiegsfrage, „wissensbasis“ bei Folgefragen, „abzweigung“
    bei Abzweigungen. `path`: die Fragen davor. `record`: der Protokolleintrag des Bots.
    `gate`: je angezeigter Folgefrage die Absicht, die der Türsteher ihr gäbe."""

    number: int
    parent: int | None
    persona: str
    kind: str
    expected: str
    path: tuple[str, ...]
    question: str
    record: Mapping[str, object]
    gate: Mapping[str, str]


CAREER = "christian/career"


@dataclass(frozen=True)
class _Pending:
    """Eine Frage, die noch gestellt werden muss."""

    parent: int | None
    persona: str
    kind: str
    expected: str
    path: tuple[str, ...]
    question: str


def explore(
    personas: Iterable[Persona], ask: Ask, classify: Classify, invent: Invent, depth: int
) -> Iterator[Node]:
    """Stellt die Fragen jeder Persona in die Breite: erst die Einstiegsfragen, dann deren
    Folgefragen und Abzweigungen, bis `depth` Klicks tief. Abzweigungen gibt es nur nach Antworten
    über Chris, und sie enden dort (keine Folgefragen davon). Eine Frage, die schon einmal gestellt
    wurde (auch bei einer anderen Persona, ohne Rücksicht auf Groß- und Kleinschreibung und
    Leerzeichen), wird übersprungen: Der Bot hätte sie ohnehin aus dem Zwischenspeicher genommen."""
    seen: set[str] = set()
    number = 0
    for persona in personas:
        queue = [
            _Pending(None, persona.name, "start", start.expected, (), start.text)
            for start in persona.questions
        ]
        while queue:
            pending = queue.pop(0)
            if _normalized(pending.question) in seen:
                continue
            seen.add(_normalized(pending.question))
            number += 1
            parent = None if pending.parent is None else f"besucher-{pending.parent}"
            record = ask(pending.question, f"besucher-{number}", parent)
            suggestions = [str(text) for text in _list(record.get("suggestions"))]
            node = Node(
                number,
                pending.parent,
                pending.persona,
                pending.kind,
                pending.expected,
                pending.path,
                pending.question,
                record,
                {suggestion: classify(suggestion) for suggestion in suggestions},
            )
            yield node
            if pending.kind != "abzweigung" and len(pending.path) < depth:
                queue += _next_questions(node, suggestions, invent)


def _next_questions(node: Node, suggestions: list[str], invent: Invent) -> list[_Pending]:
    """Die angezeigten Folgefragen und, nach einer Antwort über Chris, die Abzweigungen."""
    path = (*node.path, node.question)
    following = [
        _Pending(node.number, node.persona, "folgefrage", "wissensbasis", path, suggestion)
        for suggestion in suggestions
    ]
    if node.record.get("intent") == CAREER and node.record.get("outcome") == "answered":
        answer = str(node.record.get("answer", ""))
        following += [
            _Pending(node.number, node.persona, "abzweigung", "abzweigung", path, branch)
            for branch in invent(node.question, answer)
        ]
    return following


def _normalized(question: str) -> str:
    return " ".join(question.casefold().split())


def _list(value: object) -> list[object]:
    return list(value) if isinstance(value, list) else []


def write_nodes(nodes: Iterable[Node], path: Path) -> None:
    """Schreibt je Knoten eine JSON-Zeile (Schlüssel deutsch, wie im Bericht) und sofort auf die
    Platte: Bricht ein langer Lauf ab, ist alles bis dahin aufgezeichnet."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as file:
        for node in nodes:
            entry = {
                "nr": node.number,
                "eltern": node.parent,
                "persona": node.persona,
                "art": node.kind,
                "erwartet": node.expected,
                "pfad": list(node.path),
                "frage": node.question,
                "protokoll": dict(node.record),
                "tuersteher": dict(node.gate),
            }
            file.write(json.dumps(entry, ensure_ascii=False) + "\n")
            file.flush()


def read_nodes(path: Path) -> list[Node]:
    """Liest, was `write_nodes` geschrieben hat."""
    nodes = []
    for line in path.read_text(encoding="utf-8").splitlines():
        entry = json.loads(line)
        nodes.append(
            Node(
                entry["nr"],
                entry["eltern"],
                entry["persona"],
                entry["art"],
                entry["erwartet"],
                tuple(entry["pfad"]),
                entry["frage"],
                entry["protokoll"],
                entry["tuersteher"],
            )
        )
    return nodes


def with_replay(
    previous: Sequence[Node],
    ask: Ask,
    classify: Classify,
    invent: Invent,
    remember: Callable[[Node, str], None],
) -> tuple[Ask, Classify, Invent]:
    """Zum Fortsetzen eines abgebrochenen Laufs: `ask`, `classify` und `invent`, die für Fragen aus
    `previous` (der bisherigen Aufzeichnung) deren Ergebnis zurückgeben, statt ein Modell zu fragen.
    Weil dieselben Ergebnisse herauskommen, läuft `explore` dieselben Pfade in derselben Reihenfolge
    nach und fragt erst danach neu. Für jede so übernommene Frage ruft es `remember` mit dem Knoten
    und dem Besucher auf, als der sie jetzt gestellt wäre: Dort muss der Aufrufer nachholen, was
    beim echten Fragen hängen geblieben wäre (die Folgefragen)."""
    by_question = {_normalized(node.question): node for node in previous}
    gate = {suggestion: intent for node in previous for suggestion, intent in node.gate.items()}
    branches: dict[int, list[str]] = {}
    for node in previous:
        if node.kind == "abzweigung" and node.parent is not None:
            branches.setdefault(node.parent, []).append(node.question)

    def replayed_ask(question: str, visitor: str, parent: str | None) -> Mapping[str, object]:
        old = by_question.get(_normalized(question))
        if old is None:
            return ask(question, visitor, parent)
        remember(old, visitor)
        return old.record

    def replayed_classify(question: str) -> str:
        return gate[question] if question in gate else classify(question)

    def replayed_invent(question: str, answer: str) -> list[str]:
        # Ohne aufgezeichnete Abzweigung neu erfinden: Der Lauf kann abgebrochen sein, nachdem
        # sie erfunden, aber bevor sie gestellt waren.
        old = by_question.get(_normalized(question))
        if old is not None and old.number in branches:
            return branches[old.number]
        return invent(question, answer)

    return replayed_ask, replayed_classify, replayed_invent
