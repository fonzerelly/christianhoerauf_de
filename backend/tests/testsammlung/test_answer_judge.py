import pytest

from bot.pipeline.answer_fields import AnswerFields
from tests.fakes import FakeLanguageModel
from testsammlung.answer_judge import (
    ANSWER_CHECKS,
    K17_PROMPT,
    K24_PROMPT,
    SUGGESTION_CHECKS,
    Judge,
    read_verdict,
    read_verdicts,
)
from testsammlung.answer_score import Finding

FIELDS = AnswerFields(
    "Chris entwickelte bei der Musterbau GmbH eine Lagerverwaltung.",
    "Lagerverwaltung",
    ("Warum wählte Chris Java?", "Was erlebte Chris mit dem Gabelstapler?"),
)


@pytest.mark.parametrize(
    ("reply", "expected"),
    [
        ("URTEIL: JA\nGRUND: neutral.", (True, "neutral.")),
        ("URTEIL: **NEIN**\nGRUND: klingt nach Delikt", (False, "klingt nach Delikt")),
        ("Weiß nicht.", (None, "Weiß nicht.")),
    ],
)
def test_read_verdict(reply: str, expected: tuple[bool | None, str]) -> None:
    assert read_verdict(reply) == expected


def test_read_verdicts_reads_one_line_per_criterion() -> None:
    reply = "K1: JA – steht im Text\n**K2**: NEIN - bestreitet den Vortrag\nK3: ja\nSonstiges"

    assert read_verdicts(reply) == {
        "K1": (True, "steht im Text"),
        "K2": (False, "bestreitet den Vortrag"),
        "K3": (True, ""),
    }


def test_the_suggestion_alone_goes_to_the_calibrated_prompts_k17_and_k24() -> None:
    model = FakeLanguageModel(
        ["URTEIL: JA\nGRUND: klar", "URTEIL: NEIN\nGRUND: klingt nach Delikt"]
    )

    findings = Judge(model, "TEXTE").suggestion_alone("Warum hielt die Polizei Chris an?")

    assert [call[0]["content"] for call in model.calls] == [K17_PROMPT, K24_PROMPT]
    assert model.calls[0][1]["content"] == "Frage: Warum hielt die Polizei Chris an?"
    assert findings == [
        Finding("K17", True, True, "„Warum hielt die Polizei Chris an?“: klar"),
        Finding("K24", True, False, "„Warum hielt die Polizei Chris an?“: klingt nach Delikt"),
    ]


def test_the_answer_is_judged_with_the_knowledge_base_first() -> None:
    reply = "\n".join(f"{criterion}: JA – gut" for criterion, _, _ in ANSWER_CHECKS)
    model = FakeLanguageModel(
        [reply.replace("K1: JA – gut", "K1: NEIN – Java steht nicht im Text")]
    )

    findings = Judge(model, "TEXTE").answer("Was machte Chris?", FIELDS)

    system, user = model.calls[0]
    assert system["content"].startswith("Texte über Chris:\n\nTEXTE\n\n")
    assert "K13: " in system["content"]
    assert user["content"] == (
        "Frage des Besuchers: Was machte Chris?\n"
        "Antwort: Chris entwickelte bei der Musterbau GmbH eine Lagerverwaltung.\n"
        "Stichwort: Lagerverwaltung"
    )
    assert findings[0] == Finding("K1", True, False, "Java steht nicht im Text")
    assert [(f.criterion, f.must) for f in findings] == [(c, m) for c, m, _ in ANSWER_CHECKS]


def test_a_missing_verdict_is_a_should_finding_of_the_judge() -> None:
    model = FakeLanguageModel(["K1: JA"])

    findings = Judge(model, "TEXTE").answer("Was machte Chris?", AnswerFields("Chris kochte."))

    assert findings[0] == Finding("K1", True, True, "")
    assert Finding("Richter", False, False, "kein Urteil zu K2") in findings
    assert "Stichwort: (keins)" in model.calls[0][1]["content"]


def test_a_suggestion_is_judged_with_the_answer_and_the_other_suggestions() -> None:
    reply = "\n".join(f"{criterion}: JA" for criterion, _, _ in SUGGESTION_CHECKS)
    model = FakeLanguageModel([reply.replace("K25: JA", "K25: NEIN – Familie")])

    findings = Judge(model, "TEXTE").suggestion("Was machte Chris?", FIELDS, FIELDS.suggestions[1])

    system, user = model.calls[0]
    assert system["content"].startswith("Texte über Chris:\n\nTEXTE\n\n")
    assert user["content"] == (
        "Frage des Besuchers: Was machte Chris?\n"
        "Antwort: Chris entwickelte bei der Musterbau GmbH eine Lagerverwaltung.\n"
        "Andere Folgefragen: Warum wählte Chris Java?\n"
        "Zu prüfende Folgefrage: Was erlebte Chris mit dem Gabelstapler?"
    )
    assert findings[-1] == Finding(
        "K25", True, False, "„Was erlebte Chris mit dem Gabelstapler?“: Familie"
    )
