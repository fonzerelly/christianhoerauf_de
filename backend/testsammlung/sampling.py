"""Würfeltest des Türstehers: jede Frage mehrmals mit Temperatur 1.

Bei Temperatur 1 würfelt das Modell. Wie oft welche Absicht herauskommt, zeigt, wie sicher es
sich ist: 20 von 20 heißt eindeutig, 11 zu 9 heißt knapp an der Grenze. Aufruf über
`scripts/wuerfle.sh [--ziel macmini|dgx|bedrock] [--anzahl N] [--tuersteher DATEI]`.
"""

import argparse
import sys
from collections import Counter
from collections.abc import Callable, Sequence
from pathlib import Path

import yaml

from bot.domain.intent import Intent
from bot.pipeline.intent_classifier import GATE_MAX_TOKENS, IntentClassifier, IntentProgram
from bot.pipeline.prompts import INTENT_PROGRAM_FILE
from bot.ports.language_model import LanguageModel
from testsammlung.targets import DEFAULT_TARGET, MEASUREMENT_TARGETS, build_target_model

SAMPLING_TEMPERATURE = 1.0
SAMPLE_QUESTIONS = Path(__file__).parent / "wuerfelfragen.yaml"


def load_sample_questions(path: Path) -> list[str]:
    """Liest die Fragen des Würfeltests: eine YAML-Liste von Texten."""
    return [str(question) for question in yaml.safe_load(path.read_text(encoding="utf-8"))]


def sample(
    questions: Sequence[str], model: LanguageModel, program: IntentProgram, rounds: int
) -> list[tuple[str, Counter[Intent]]]:
    """Stellt jede Frage `rounds`-mal dem Türsteher und zählt, welche Absicht wie oft kam."""
    classifier = IntentClassifier(model, program)
    return [
        (question, Counter(classifier.classify(question) for _ in range(rounds)))
        for question in questions
    ]


def sample_line(target: str, question: str, counts: Counter[Intent]) -> str:
    """Eine Zeile Ergebnis: Ziel, Frage, Absichten nach Häufigkeit."""
    intents = ", ".join(f"{intent.value} {count}" for intent, count in counts.most_common())
    return f"{target:8} {question!r:18} {intents}"


def build_sampling_model(target: str) -> LanguageModel:
    """Gemma auf dem Ziel wie der Türsteher im Betrieb, nur mit Temperatur 1."""
    return build_target_model(
        target, timeout_seconds=120, temperature=SAMPLING_TEMPERATURE, max_tokens=GATE_MAX_TOKENS
    )


def main(
    argv: Sequence[str] = (),
    model_factory: Callable[[str], LanguageModel] = build_sampling_model,
    questions_file: Path = SAMPLE_QUESTIONS,
) -> int:
    """Liest `--ziel`, `--anzahl` und `--tuersteher`, würfelt jede Frage aus `questions_file`
    und druckt nach jeder Frage eine Zeile. Exit 0."""
    parser = argparse.ArgumentParser(description="Würfeltest des Türstehers mit Temperatur 1")
    parser.add_argument("--ziel", choices=MEASUREMENT_TARGETS, default=DEFAULT_TARGET)
    parser.add_argument("--anzahl", type=int, default=20)
    parser.add_argument("--tuersteher", type=Path, default=INTENT_PROGRAM_FILE)
    arguments = parser.parse_args(argv)
    program = IntentProgram.from_json(arguments.tuersteher.read_text(encoding="utf-8"))
    model = model_factory(arguments.ziel)
    for question in load_sample_questions(questions_file):
        [(_, counts)] = sample([question], model, program, arguments.anzahl)
        print(sample_line(arguments.ziel, question, counts), flush=True)
    return 0


if __name__ == "__main__":  # pragma: no cover - Einstieg, wird per Skript gestartet
    sys.exit(main(sys.argv[1:]))
