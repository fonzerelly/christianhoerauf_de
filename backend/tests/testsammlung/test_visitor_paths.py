"""Der Pfad-Erkunder des Integrationstests „Besucherpfade“ (Aufzeichnen, ohne Modell)."""

from collections.abc import Mapping
from pathlib import Path

from testsammlung.visitor_paths import Node, explore, read_nodes, with_replay, write_nodes
from testsammlung.visitor_scenarios import Persona, StartQuestion

CAREER = "christian/career"


def answered(answer: str, *suggestions: str, intent: str = CAREER) -> dict[str, object]:
    record: dict[str, object] = {"intent": intent, "outcome": "answered", "answer": answer}
    if suggestions:
        record["suggestions"] = list(suggestions)
    return record


class FakeSite:
    """Bot, Türsteher und Besucher als Attrappe: Antworten aus `answers`, jede Folgefrage zählt
    zur Laufbahn, `branches` liefert die Rückfragen des Besuchers zu einer Antwort."""

    def __init__(
        self,
        answers: Mapping[str, dict[str, object]],
        branches: Mapping[str, list[str]] | None = None,
    ) -> None:
        self.answers = answers
        self.branches = branches or {}
        self.asked: list[tuple[str, str]] = []
        self.classified: list[str] = []

    def ask(self, question: str, visitor: str) -> Mapping[str, object]:
        self.asked.append((question, visitor))
        return {"question": question, **self.answers[question]}

    def classify(self, question: str) -> str:
        self.classified.append(question)
        return CAREER

    def invent(self, question: str, answer: str) -> list[str]:
        return self.branches.get(answer, [])


def persona(*questions: StartQuestion, name: str = "baeckerin") -> Persona:
    return Persona(name, "Sucht eine Aushilfe.", questions)


def run(site: FakeSite, personas: list[Persona], depth: int = 2) -> list[Node]:
    return list(explore(personas, site.ask, site.classify, site.invent, depth))


def test_a_start_question_becomes_a_node_with_the_bots_record() -> None:
    site = FakeSite({"Wie spät ist es?": answered("Kurz nach drei.", intent="general/live_data")})

    nodes = run(site, [persona(StartQuestion("Wie spät ist es?", "allgemein"))])

    assert nodes == [
        Node(
            number=1,
            parent=None,
            persona="baeckerin",
            kind="start",
            expected="allgemein",
            path=(),
            question="Wie spät ist es?",
            record={
                "question": "Wie spät ist es?",
                "intent": "general/live_data",
                "outcome": "answered",
                "answer": "Kurz nach drei.",
            },
            gate={},
        )
    ]


def test_suggestions_are_clicked_up_to_the_depth_and_all_shown_ones_go_to_the_gate() -> None:
    site = FakeSite(
        {
            "Kann Chris backen?": answered("Ja.", "Was backt Chris?", "Wo lernte Chris backen?"),
            "Was backt Chris?": answered("Brezen.", "Warum backt Chris Brezen?"),
            "Wo lernte Chris backen?": answered("Bei der Oma."),
        }
    )

    nodes = run(site, [persona(StartQuestion("Kann Chris backen?", "wissensbasis"))], depth=1)

    assert [(node.number, node.parent, node.kind, node.path, node.question) for node in nodes] == [
        (1, None, "start", (), "Kann Chris backen?"),
        (2, 1, "folgefrage", ("Kann Chris backen?",), "Was backt Chris?"),
        (3, 1, "folgefrage", ("Kann Chris backen?",), "Wo lernte Chris backen?"),
    ]
    assert [node.expected for node in nodes] == ["wissensbasis"] * 3
    assert nodes[0].gate == {"Was backt Chris?": CAREER, "Wo lernte Chris backen?": CAREER}
    # Auf der letzten Ebene wird nicht mehr geklickt, aber der Türsteher sieht die Folgefrage.
    assert nodes[1].gate == {"Warum backt Chris Brezen?": CAREER}


def test_every_question_is_asked_once_and_by_a_new_visitor() -> None:
    site = FakeSite(
        {
            "Kann Chris backen?": answered("Ja.", "Was backt Chris?"),
            "Was backt Chris?": answered("Brezen.", "kann chris  backen?"),
        }
    )
    start = StartQuestion("Kann Chris backen?", "wissensbasis")

    nodes = run(site, [persona(start), persona(start, name="nachbar")])

    assert [node.question for node in nodes] == ["Kann Chris backen?", "Was backt Chris?"]
    assert [visitor for _, visitor in site.asked] == ["besucher-1", "besucher-2"]


def test_the_visitor_asks_back_after_answers_about_chris_but_those_branches_end_there() -> None:
    site = FakeSite(
        {
            "Was hat Chris studiert?": answered("Medientechnik.", "Wo studierte Chris?"),
            "Wo studierte Chris?": answered("In Ansbach."),
            "Was ist Medientechnik?": answered("Ein Studienfach.", "Was machte Chris danach?"),
        },
        branches={"Medientechnik.": ["Was ist Medientechnik?"], "In Ansbach.": ["Wo ist das?"]},
    )

    nodes = run(site, [persona(StartQuestion("Was hat Chris studiert?", "wissensbasis"))], depth=1)

    assert [(node.parent, node.kind, node.expected, node.question) for node in nodes] == [
        (None, "start", "wissensbasis", "Was hat Chris studiert?"),
        (1, "folgefrage", "wissensbasis", "Wo studierte Chris?"),
        (1, "abzweigung", "abzweigung", "Was ist Medientechnik?"),
    ]


def test_general_answers_and_fixed_texts_get_no_branches() -> None:
    site = FakeSite(
        {"Wie spät ist es?": answered("Drei.", intent="general/live_data")},
        branches={"Drei.": ["Wirklich?"]},
    )

    nodes = run(site, [persona(StartQuestion("Wie spät ist es?", "allgemein"))])

    assert [node.question for node in nodes] == ["Wie spät ist es?"]


def test_written_nodes_are_read_back_unchanged(tmp_path: Path) -> None:
    site = FakeSite(
        {
            "Kann Chris backen?": answered("Ja.", "Was backt Chris?"),
            "Was backt Chris?": answered("Brezen."),
        }
    )
    nodes = run(site, [persona(StartQuestion("Kann Chris backen?", "wissensbasis"))])
    file = tmp_path / "aufzeichnung.jsonl"

    write_nodes(nodes, file)

    assert read_nodes(file) == nodes


def test_resuming_replays_recorded_questions_and_asks_only_the_rest() -> None:
    answers = {
        "Was hat Chris studiert?": answered("Medientechnik.", "Wo studierte Chris?"),
        "Wo studierte Chris?": answered("In Ansbach."),
        "Was ist Medientechnik?": answered("Ein Fach.", intent="general/knowledge"),
    }
    personas = [persona(StartQuestion("Was hat Chris studiert?", "wissensbasis"))]
    full = run(FakeSite(answers, branches={"Medientechnik.": ["Was ist Medientechnik?"]}), personas)
    site = FakeSite(answers)  # erfindet keine Abzweigungen mehr: die kommen aus der Aufzeichnung
    replayed: list[str] = []

    ask, classify, invent = with_replay(
        full[:1], site.ask, site.classify, site.invent, lambda node: replayed.append(node.question)
    )
    resumed = list(explore(personas, ask, classify, invent, depth=2))

    assert resumed == full[:1] + [node for node in full[1:] if node.kind != "abzweigung"]
    assert [question for question, _ in site.asked] == ["Wo studierte Chris?"]
    assert site.classified == []  # die Folgefrage von Frage 1 stuft die Aufzeichnung schon ein
    assert replayed == ["Was hat Chris studiert?"]


def test_resuming_takes_the_recorded_branches_of_a_replayed_answer() -> None:
    answers = {
        "Was hat Chris studiert?": answered("Medientechnik."),
        "Was ist Medientechnik?": answered("Ein Fach.", intent="general/knowledge"),
    }
    personas = [persona(StartQuestion("Was hat Chris studiert?", "wissensbasis"))]
    full = run(FakeSite(answers, branches={"Medientechnik.": ["Was ist Medientechnik?"]}), personas)
    site = FakeSite(answers)

    ask, classify, invent = with_replay(
        full, site.ask, site.classify, site.invent, lambda node: None
    )

    assert list(explore(personas, ask, classify, invent, depth=2)) == full
    assert site.asked == []
