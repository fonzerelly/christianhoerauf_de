"""Eichung: Urteilen die Modelle so wie Christian?

Zwei Prüfungen, je mit einer Datei, die Christian von Hand ausgefüllt hat
(docs/backend/antwort-prompt/, verschlüsselt):

- `richter`: Qwen beurteilt die 90 Folgefragen aus `eichung_richter.yaml` nach K17
  (verständlich ohne die Antwort) und K24 (kein schlechter Eindruck).
- `sollwerte`: Gemma beantwortet die Fragen aus `sollwerte_stichwort.yaml` mit dem aktuellen
  Prompt, das Stichwort wird an Christians Sollwerten gemessen, sonst mit Kev verglichen.

Aufruf über `scripts/eiche_richter.sh` und `scripts/pruefe_sollwerte.sh`. Die Eichung von Qwen
an den 49 Stichwort-Urteilen (`eichung_stichwort.yaml`, K13) ist seit 07.11.2026 stillgelegt: Die
Urteile stammen aus der Zeit vor der Oberbegriff-Regel; Sollwerte und Kev ersetzen sie.
Einzelheiten landen in `versuche/eichung.<prüfung>.json`.
"""

import argparse
import json
import sys
from collections.abc import Callable, Mapping, Sequence
from dataclasses import dataclass
from pathlib import Path

import yaml

from bot.adapters.knowledge_files import knowledge_texts
from bot.pipeline.answer_fields import checked_answer_fields, read_answer_fields
from bot.ports.language_model import LanguageModel
from testsammlung.answer_judge import Judge
from testsammlung.answer_measurement import (
    BACKEND,
    CLOSING_FILE,
    KNOWLEDGE_DIR,
    PROMPT_FILE,
    build_answer_model,
    build_judge,
    system_prompt,
)
from testsammlung.answer_questions import load_answer_questions
from testsammlung.kev import Kev
from testsammlung.keyword_reference import (
    Comparer,
    Expected,
    Rating,
    load_reference_keywords,
    rate_keyword,
)
from testsammlung.targets import KEV_URL, MEASUREMENT_TARGETS

DOCS = BACKEND.parent / "docs" / "backend" / "antwort-prompt"
SUGGESTION_LABELS = DOCS / "eichung_richter.yaml"
REFERENCE_FILE = DOCS / "sollwerte_stichwort.yaml"


@dataclass(frozen=True)
class SuggestionLabel:
    """Christians Urteil über eine Folgefrage: verständlich ohne die Antwort (K17) und ohne
    schlechten Eindruck (K24)."""

    name: str
    suggestion: str
    understandable: bool
    good_impression: bool


@dataclass(frozen=True)
class Verdict:
    """Ein Kriterium für einen Eintrag: Christians Urteil, das des Richters und dessen Grund.
    `shown` ist, was beurteilt wurde (Folgefrage oder Stichwort)."""

    name: str
    criterion: str
    shown: str
    christian: bool
    judge: bool
    reason: str


@dataclass(frozen=True)
class Agreement:
    """Wie oft der Richter wie Christian urteilt; `caught` von `failures` sind die Einträge, die
    bei Christian durchfallen und beim Richter auch; `false_alarms` lässt nur der Richter
    durchfallen."""

    same: int
    total: int
    caught: int
    failures: int
    false_alarms: int


@dataclass(frozen=True)
class KeywordResult:
    """Eine Antwort von Gemma: Frage, das Stichwort, das der Bot zeigen würde, Rohtext, Note."""

    question: str
    keyword: str | None
    raw: str
    rating: Rating


def _entries(path: Path) -> list[dict[str, object]]:
    entries: list[dict[str, object]] = yaml.safe_load(path.read_text(encoding="utf-8"))
    return entries


def load_suggestion_labels(path: Path) -> list[SuggestionLabel]:
    """Liest `eichung_richter.yaml`: `urteil` (und optional `auch`) ist ok, u (K17 fällt durch)
    oder s (K24 fällt durch)."""
    labels = []
    for entry in _entries(path):
        verdicts = {entry["urteil"], entry.get("auch")}
        labels.append(
            SuggestionLabel(
                f"Runde {entry['runde']}, Nr. {entry['nr']}",
                str(entry["frage"]),
                "u" not in verdicts,
                "s" not in verdicts,
            )
        )
    return labels


def agreement(verdicts: Sequence[Verdict]) -> Agreement:
    """Zählt die Übereinstimmung von Richter und Christian."""
    return Agreement(
        same=sum(v.judge == v.christian for v in verdicts),
        total=len(verdicts),
        caught=sum(not v.judge and not v.christian for v in verdicts),
        failures=sum(not v.christian for v in verdicts),
        false_alarms=sum(not v.judge and v.christian for v in verdicts),
    )


def judge_suggestions(judge: Judge, labels: Sequence[SuggestionLabel]) -> list[Verdict]:
    """Fragt den Richter wie in der Messung K17 und K24 je Folgefrage (er sieht nur sie)."""
    verdicts = []
    for label in labels:
        christian = {"K17": label.understandable, "K24": label.good_impression}
        for finding in judge.suggestion_alone(label.suggestion):
            reason = finding.note.removeprefix(f"„{label.suggestion}“: ")
            verdicts.append(
                Verdict(
                    label.name,
                    finding.criterion,
                    label.suggestion,
                    christian[finding.criterion],
                    finding.passed,
                    reason,
                )
            )
    return verdicts


def _state(passed: bool) -> str:
    return "bestanden" if passed else "durchgefallen"


def calibration_report(verdicts: Sequence[Verdict], judge_name: str) -> str:
    """Je Kriterium die Übereinstimmung und darunter jede Abweichung mit dem Grund des
    Richters."""
    lines = []
    criteria = dict.fromkeys(v.criterion for v in verdicts)
    for criterion in criteria:
        mine = [v for v in verdicts if v.criterion == criterion]
        a = agreement(mine)
        lines.append(
            f"{criterion} ({judge_name}): {a.same}/{a.total} wie Christian, "
            f"{a.caught} von {a.failures} Durchfallern erkannt, {a.false_alarms} Fehlalarme"
        )
        lines += [
            f"  {v.name}: Christian {_state(v.christian)}, {judge_name} {_state(v.judge)}"
            f" – „{v.shown}“ – {v.reason}"
            for v in mine
            if v.judge != v.christian
        ]
    return "\n".join(lines)


def measure_reference_keywords(
    questions: Sequence[str],
    references: Mapping[str, Expected],
    model: LanguageModel,
    system: str,
    kev: Comparer,
    rounds: int,
) -> list[KeywordResult]:
    """Gemma beantwortet jede Frage einmal je Runde; bewertet wird das Stichwort, das nach den
    Prüfungen im Code übrig bleibt. Erst alle Fragen, dann die nächste Runde: So bleibt der
    lange Systemprompt im Zwischenspeicher von LM Studio."""
    results = []
    for _ in range(rounds):
        for question in questions:
            raw = model.complete(
                [{"role": "system", "content": system}, {"role": "user", "content": question}]
            )
            fields = checked_answer_fields(read_answer_fields(raw))
            rating = rate_keyword(
                question, fields.answer, fields.keyword, references[question], kev
            )
            results.append(KeywordResult(question, fields.keyword, raw, rating))
    return results


def _shown_keyword(result: KeywordResult) -> str:
    """Das Stichwort in Anführungszeichen; hat der Code es verworfen, das, was Gemma
    geschrieben hatte."""
    if result.keyword is not None:
        return f"„{result.keyword}“"
    written = read_answer_fields(result.raw).keyword
    return f"verworfen: „{written}“" if written else "keins"


def reference_report(results: Sequence[KeywordResult]) -> str:
    """Mittlere Note, Anteil mit Note ab 0,5 (Treffer oder Kev gleich gut) und darunter jedes
    schwache Stichwort. `frei` zählt nicht."""
    rated = [r for r in results if r.rating.score is not None]
    scores = [r.rating.score for r in rated if r.rating.score is not None]
    good = sum(score >= 0.5 for score in scores)
    lines = [
        f"Note {sum(scores) / len(scores):.2f}, Sollwert getroffen oder Kev ≥ 0,5: "
        f"{good}/{len(scores)} = {round(100 * good / len(scores))} %"
    ]
    lines += [
        f"  {r.rating.score:.2f}  {r.question} → {_shown_keyword(r)} ({r.rating.reason})"
        for r in rated
        if r.rating.score is not None and r.rating.score < 0.5
    ]
    return "\n".join(lines)


def build_kev() -> Comparer:
    """Kev auf der DGX."""
    return Kev(KEV_URL)


def _write(path: Path, details: list[dict[str, object]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(details, ensure_ascii=False, indent=1) + "\n", "utf-8")
    print(f"Gespeichert: {path}")


def _verdict_details(verdicts: Sequence[Verdict]) -> list[dict[str, object]]:
    return [
        {
            "name": v.name,
            "kriterium": v.criterion,
            "gezeigt": v.shown,
            "christian": v.christian,
            "richter": v.judge,
            "grund": v.reason,
        }
        for v in verdicts
    ]


def _parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Eichung der Modelle an Christians Urteilen")
    commands = parser.add_subparsers(dest="pruefung", required=True)
    richter = commands.add_parser("richter", help="Qwen: K17 und K24 der Folgefragen")
    richter.add_argument("--datei", type=Path, default=SUGGESTION_LABELS)
    sollwerte = commands.add_parser("sollwerte", help="Gemma und Kev: Stichwort gegen Sollwerte")
    sollwerte.add_argument("--datei", type=Path, default=REFERENCE_FILE)
    sollwerte.add_argument("--fragen", type=Path, default=None)
    sollwerte.add_argument("--ziel", choices=MEASUREMENT_TARGETS, default="dgx")
    sollwerte.add_argument("--prompt", type=Path, default=PROMPT_FILE)
    sollwerte.add_argument("--schluss", type=Path, default=CLOSING_FILE)
    sollwerte.add_argument("--runden", type=int, default=1)
    for command in (richter, sollwerte):
        command.add_argument("--aus", type=Path, default=None)
    sollwerte.add_argument("--wissensbasis", type=Path, default=KNOWLEDGE_DIR)
    return parser


def main(
    argv: Sequence[str] = (),
    judge_model_factory: Callable[[], LanguageModel] = build_judge,
    answer_model_factory: Callable[[str], LanguageModel] = build_answer_model,
    kev_factory: Callable[[], Comparer] = build_kev,
) -> int:
    """Liest die Optionen, führt die gewählte Prüfung aus, druckt den Bericht und schreibt die
    Einzelheiten nach `--aus`."""
    arguments = _parser().parse_args(argv)
    report = arguments.aus or BACKEND / "versuche" / f"eichung.{arguments.pruefung}.json"
    if arguments.pruefung == "richter":
        suggestion_labels = load_suggestion_labels(arguments.datei)
        print(f"Qwen beurteilt {len(suggestion_labels)} Folgefragen …", flush=True)
        verdicts = judge_suggestions(Judge(judge_model_factory(), ""), suggestion_labels)
        print(calibration_report(verdicts, "Qwen"))
        _write(report, _verdict_details(verdicts))
    else:
        references = load_reference_keywords(arguments.datei)
        questions = list(references)
        if arguments.fragen:
            asked = [q.text for q in load_answer_questions(arguments.fragen)]
            questions = [question for question in asked if question in references]
        system = system_prompt(
            arguments.prompt.read_text(encoding="utf-8"),
            knowledge_texts(arguments.wissensbasis),
            arguments.schluss.read_text(encoding="utf-8"),
        )
        print(f"Gemma ({arguments.ziel}) beantwortet {len(questions)} Fragen …", flush=True)
        results = measure_reference_keywords(
            questions,
            references,
            answer_model_factory(arguments.ziel),
            system,
            kev_factory(),
            arguments.runden,
        )
        print(reference_report(results))
        _write(
            report,
            [
                {
                    "frage": r.question,
                    "stichwort": r.keyword,
                    "note": r.rating.score,
                    "grund": r.rating.reason,
                    "roh": r.raw,
                }
                for r in results
            ],
        )
    return 0


if __name__ == "__main__":  # pragma: no cover - Einstieg, wird per Skript gestartet
    sys.exit(main(sys.argv[1:]))
