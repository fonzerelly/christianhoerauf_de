import json

from tests.conftest import FakeServer
from testsammlung.kev import KEV_RULE, Kev

REPLY = {
    "answers": {
        "wahl": {
            "type": "choice",
            "choice": "Lager",
            "probabilities": {"Lager": 0.7, "Musterbau Highlights": 0.3},
        }
    }
}


def test_prefers_returns_kevs_probability_for_the_first_heading(server: FakeServer) -> None:
    server.body = json.dumps(REPLY).encode()

    kev = Kev(server.base_url)

    assert (
        kev.prefers("Was machte Chris?", "Chris baute ein Lager.", "Lager", "Musterbau Highlights")
        == 0.7
    )


def test_prefers_sends_question_answer_and_both_headings_as_a_choice(server: FakeServer) -> None:
    server.body = json.dumps(REPLY).encode()

    Kev(server.base_url).prefers(
        "Was machte Chris?", "Chris baute ein Lager.", "Lager", "Musterbau Highlights"
    )

    body = server.requests[0]["body"]
    assert body == {
        "model": "kev-4b",
        "state": f"{KEV_RULE}\n\nFrage: Was machte Chris?\nAntwort: Chris baute ein Lager.",
        "questions": {
            "wahl": {
                "type": "choice",
                "instructions": (
                    "Welches Stichwort ist die bessere Überschrift für Frage und Antwort?"
                ),
                "criteria": {"Lager": None, "Musterbau Highlights": None},
            }
        },
    }
