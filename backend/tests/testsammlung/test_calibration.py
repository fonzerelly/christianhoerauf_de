import json
from pathlib import Path

import pytest

from bot.ports.language_model import LanguageModel
from tests.fakes import FakeLanguageModel
from testsammlung.answer_judge import Judge
from testsammlung.calibration import (
    Agreement,
    KeywordResult,
    SuggestionLabel,
    Verdict,
    agreement,
    build_kev,
    calibration_report,
    judge_suggestions,
    load_suggestion_labels,
    main,
    measure_reference_keywords,
    reference_report,
)
from testsammlung.kev import Kev
from testsammlung.keyword_reference import Rating

RICHTER = """# Kopf
- nr: 1
  runde: 1
  frage: "Warum wählte Chris Java?"
  ausgedacht: false
  urteil: "ok"

- nr: 2
  runde: 1
  frage: "Warum tat er das?"
  ausgedacht: false
  urteil: "u"

- nr: 1
  runde: 2
  frage: "Warum musste Chris zur Polizei?"
  ausgedacht: true
  urteil: "s"
  auch: "u"
"""

RAW = (
    "[[ ## antwort ## ]]\nChris baute ein Lager.\n\n"
    "[[ ## stichwort ## ]]\nGabelstapler\n\n"
    "[[ ## folgefragen ## ]]\nWarum wählte Chris Java?\n\n[[ ## completed ## ]]"
)


def write(path: Path, text: str) -> Path:
    path.write_text(text, encoding="utf-8")
    return path


def test_load_suggestion_labels_turns_u_and_s_into_failed_k17_and_k24(tmp_path: Path) -> None:
    labels = load_suggestion_labels(write(tmp_path / "richter.yaml", RICHTER))

    assert labels == [
        SuggestionLabel("Runde 1, Nr. 1", "Warum wählte Chris Java?", True, True),
        SuggestionLabel("Runde 1, Nr. 2", "Warum tat er das?", False, True),
        SuggestionLabel("Runde 2, Nr. 1", "Warum musste Chris zur Polizei?", False, False),
    ]


def verdict(christian: bool, judged: bool) -> Verdict:
    return Verdict("Nr. 1", "K17", "Frage?", christian, judged, "")


def test_agreement_counts_same_verdicts_caught_failures_and_false_alarms() -> None:
    verdicts = [
        verdict(True, True),
        verdict(False, False),
        verdict(False, True),
        verdict(True, False),
        verdict(True, True),
    ]

    assert agreement(verdicts) == Agreement(same=3, total=5, caught=1, failures=2, false_alarms=1)


def test_judge_suggestions_asks_k17_and_k24_for_each_label() -> None:
    labels = [SuggestionLabel("Runde 1, Nr. 2", "Warum tat er das?", False, True)]
    model = FakeLanguageModel(["URTEIL: JA\nGRUND: klar", "URTEIL: JA\nGRUND: harmlos"])

    verdicts = judge_suggestions(Judge(model, ""), labels)

    assert verdicts == [
        Verdict("Runde 1, Nr. 2", "K17", "Warum tat er das?", False, True, "klar"),
        Verdict("Runde 1, Nr. 2", "K24", "Warum tat er das?", True, True, "harmlos"),
    ]


def test_calibration_report_shows_the_agreement_and_each_difference() -> None:
    verdicts = [
        Verdict("Runde 1, Nr. 1", "K17", "Warum wählte Chris Java?", True, True, "klar"),
        Verdict("Runde 1, Nr. 2", "K17", "Warum tat er das?", False, True, "klar genug"),
        Verdict("Runde 1, Nr. 1", "K24", "Warum wählte Chris Java?", True, False, "heikel"),
    ]

    assert calibration_report(verdicts, "Qwen") == (
        "K17 (Qwen): 1/2 wie Christian, 0 von 1 Durchfallern erkannt, 0 Fehlalarme\n"
        "  Runde 1, Nr. 2: Christian durchgefallen, Qwen bestanden"
        " – „Warum tat er das?“ – klar genug\n"
        "K24 (Qwen): 0/1 wie Christian, 0 von 0 Durchfallern erkannt, 1 Fehlalarme\n"
        "  Runde 1, Nr. 1: Christian bestanden, Qwen durchgefallen"
        " – „Warum wählte Chris Java?“ – heikel"
    )


class FakeKev:
    def __init__(self, probability: float) -> None:
        self.probability = probability

    def prefers(self, question: str, answer: str, mine: str, reference: str) -> float:
        return self.probability


def test_measure_reference_keywords_asks_each_question_per_round_and_rates_the_shown_keyword() -> (
    None
):
    model = FakeLanguageModel([RAW, RAW])
    references = {"Was machte Chris?": ("Lager",)}

    results = measure_reference_keywords(
        ["Was machte Chris?"], references, model, "SYSTEM", FakeKev(0.25), rounds=2
    )

    expected = KeywordResult(
        "Was machte Chris?", "Gabelstapler", RAW, Rating(0.25, "Kev 0.25 gegen „Lager“")
    )
    assert results == [expected, expected]
    assert model.calls[0] == [
        {"role": "system", "content": "SYSTEM"},
        {"role": "user", "content": "Was machte Chris?"},
    ]


def test_reference_report_shows_the_mean_the_good_share_and_the_weak_keywords() -> None:
    results = [
        KeywordResult("Was machte Chris?", "Lager", "", Rating(1.0, "Treffer")),
        KeywordResult(
            "Was machte Chris wirklich?", "Gabelstapler", "", Rating(0.2, "Kev 0.20 gegen „Lager“")
        ),
        KeywordResult("Kann Chris Cobol?", None, "", Rating(1.0, "keins")),
        KeywordResult("Erzähl was Lustiges.", "Witz", "", Rating(None, "frei")),
    ]

    assert reference_report(results) == (
        "Note 0.73, Sollwert getroffen oder Kev ≥ 0,5: 2/3 = 67 %\n"
        "  0.20  Was machte Chris wirklich? → „Gabelstapler“ (Kev 0.20 gegen „Lager“)"
    )


def test_reference_report_shows_what_gemma_wrote_when_the_code_dropped_the_keyword() -> None:
    dropped = RAW.replace("Gabelstapler", "Lagerverwaltungssoftware Highlights")
    results = [
        KeywordResult("Was machte Chris?", None, dropped, Rating(0.0, "kein gültiges Stichwort")),
        KeywordResult(
            "Was tat Chris?", None, "Chris baute ein Lager.", Rating(0.0, "kein gültiges Stichwort")
        ),
    ]

    assert reference_report(results).splitlines()[1:] == [
        "  0.00  Was machte Chris? → verworfen: „Lagerverwaltungssoftware Highlights“"
        " (kein gültiges Stichwort)",
        "  0.00  Was tat Chris? → keins (kein gültiges Stichwort)",
    ]


def test_main_richter_compares_qwen_with_christian_and_writes_the_details(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    labels = write(tmp_path / "richter.yaml", RICHTER)
    report = tmp_path / "bericht.json"
    model = FakeLanguageModel(["URTEIL: JA\nGRUND: gut"] * 6)

    exit_code = main(
        ["richter", "--datei", str(labels), "--aus", str(report)], judge_model_factory=lambda: model
    )

    assert exit_code == 0
    output = capsys.readouterr().out
    assert "K17 (Qwen): 1/3 wie Christian, 0 von 2 Durchfallern erkannt, 0 Fehlalarme" in output
    assert "K24 (Qwen): 2/3 wie Christian" in output
    details = json.loads(report.read_text(encoding="utf-8"))
    assert details[0] == {
        "name": "Runde 1, Nr. 1",
        "kriterium": "K17",
        "gezeigt": "Warum wählte Chris Java?",
        "christian": True,
        "richter": True,
        "grund": "gut",
    }


def knowledge_base(tmp_path: Path) -> Path:
    folder = tmp_path / "wissensbasis"
    (folder / "stationen").mkdir(parents=True)
    (folder / "stationen" / "musterbau.md").write_text("Musterbau-Text", "utf-8")
    return folder


def test_main_sollwerte_lets_gemma_answer_on_the_target_and_kev_compare(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    references = write(
        tmp_path / "sollwerte.yaml",
        '- {frage: "Was machte Chris?", soll: ["Lager"]}\n'
        '- {frage: "Nur im Training?", soll: ["Training"]}\n',
    )
    questions = write(tmp_path / "fragen.yaml", '- {frage: "Was machte Chris?"}\n')
    prompt = write(tmp_path / "prompt.md", "REGELN\n")
    closing = write(tmp_path / "schluss.md", "SCHLUSS")
    report = tmp_path / "bericht.json"
    model = FakeLanguageModel([RAW, RAW])
    targets: list[str] = []

    def answers_on(target: str) -> LanguageModel:
        targets.append(target)
        return model

    main(
        [
            "sollwerte",
            "--datei",
            str(references),
            "--fragen",
            str(questions),
            "--prompt",
            str(prompt),
            "--schluss",
            str(closing),
            "--wissensbasis",
            str(knowledge_base(tmp_path)),
            "--runden",
            "2",
            "--aus",
            str(report),
        ],
        answer_model_factory=answers_on,
        kev_factory=lambda: FakeKev(0.75),
    )

    assert targets == ["dgx"]
    assert (
        model.calls[0][0]["content"]
        == "REGELN\n# stationen/musterbau.md\n\nMusterbau-Text\n\nSCHLUSS"
    )
    assert "Sollwert getroffen oder Kev ≥ 0,5: 2/2 = 100 %" in capsys.readouterr().out
    details = json.loads(report.read_text(encoding="utf-8"))
    assert details[0] == {
        "frage": "Was machte Chris?",
        "stichwort": "Gabelstapler",
        "note": 0.75,
        "grund": "Kev 0.75 gegen „Lager“",
        "roh": RAW,
    }


def test_main_sollwerte_without_question_file_asks_every_question_with_a_reference(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    references = write(
        tmp_path / "sollwerte.yaml",
        '- {frage: "Was machte Chris?", soll: ["Gabelstapler"]}\n'
        '- {frage: "Kann Chris Cobol?", soll: keins}\n',
    )
    model = FakeLanguageModel([RAW, "Darüber lerne ich gerade noch."])

    main(
        [
            "sollwerte",
            "--datei",
            str(references),
            "--wissensbasis",
            str(knowledge_base(tmp_path)),
            "--aus",
            str(tmp_path / "bericht.json"),
        ],
        answer_model_factory=lambda target: model,
        kev_factory=lambda: FakeKev(0.0),
    )

    assert [call[1]["content"] for call in model.calls] == [
        "Was machte Chris?",
        "Kann Chris Cobol?",
    ]
    assert "2/2 = 100 %" in capsys.readouterr().out


def test_build_kev_talks_to_kev_on_the_dgx() -> None:
    assert isinstance(build_kev(), Kev)
