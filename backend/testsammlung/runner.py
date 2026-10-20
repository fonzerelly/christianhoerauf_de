import argparse
import sys
from collections import defaultdict
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from pathlib import Path

from bot.adapters.bedrock_token import (
    BEDROCK_BASE_URL,
    BEDROCK_MODEL,
    BEDROCK_REGION,
    bedrock_token_provider,
)
from bot.adapters.openai_compatible import OpenAiCompatibleModel
from bot.domain.intent import Intent
from bot.pipeline.general_answerer import GeneralAnswerer
from bot.pipeline.intent_classifier import IntentClassifier
from bot.pipeline.prompts import load_prompt
from bot.ports.language_model import LanguageModel, LanguageModelError
from testsammlung.cases import CASES_FILE, Case, load_cases

LM_STUDIO_URL = "http://192.168.178.91:1234/v1"
LM_STUDIO_MODEL = "google/gemma-4-26b-a4b-qat"


@dataclass(frozen=True)
class CaseResult:
    case: Case
    actual: Intent | None  # None: das Modell ist ausgefallen
    answer: str | None
    answer_ok: bool | None  # None: Antwort wurde nicht geprüft

    @property
    def intent_ok(self) -> bool:
        return self.actual == self.case.intent


def run_case(case: Case, classifier: IntentClassifier, answerer: GeneralAnswerer) -> CaseResult:
    """Bestimmt die Absicht; bei Rechenfragen oder Wortprüfung wird auch die Antwort geholt."""
    try:
        actual: Intent | None = classifier.classify(case.question)
    except LanguageModelError:
        actual = None
    if not (case.group == "arithmetic" or case.must_contain or case.must_not_contain):
        return CaseResult(case, actual, None, None)
    try:
        answer = answerer.answer(case.question)
    except LanguageModelError:
        return CaseResult(case, actual, None, False)
    words_ok = all(word in answer for word in case.must_contain) and not any(
        word in answer for word in case.must_not_contain
    )
    return CaseResult(case, actual, answer, words_ok)


def summarize(results: Sequence[CaseResult]) -> str:
    """Trefferquote je erwarteter Absicht, Fehlgriffe, Ergebnis der Rechenfragen."""
    per_intent: dict[str, list[CaseResult]] = defaultdict(list)
    for result in results:
        per_intent[result.case.intent.value].append(result)
    lines = ["Trefferquote je Absicht:"]
    for intent, group in sorted(per_intent.items()):
        hits = sum(result.intent_ok for result in group)
        lines.append(f"  {intent}: {hits}/{len(group)} ({round(100 * hits / len(group))} %)")
    for result in results:
        if not result.intent_ok:
            got = result.actual.value if result.actual else "Modellausfall"
            lines.append(
                f"  Fehlgriff: {result.case.question} "
                f"(erwartet {result.case.intent.value}, bekommen {got})"
            )
    arithmetic = [result for result in results if result.case.group == "arithmetic"]
    right = sum(result.answer_ok is True for result in arithmetic)
    lines.append(f"Rechenfragen: {right}/{len(arithmetic)} richtig")
    for result in arithmetic:
        if result.answer_ok is not True:
            lines.append(f"  falsch: {result.case.question} -> {result.answer}")
    return "\n".join(lines)


def build_model(target: str) -> LanguageModel:
    """`lmstudio`: Mac mini im Heimnetz. `bedrock`: Bedrock Frankfurt mit den eigenen
    AWS-Zugangsdaten des Aufrufers (nur dann ein Aufruf bei AWS, wenn Christian ihn startet)."""
    if target == "lmstudio":
        return OpenAiCompatibleModel(LM_STUDIO_URL, LM_STUDIO_MODEL, None, timeout_seconds=120)
    if target == "bedrock":
        return OpenAiCompatibleModel(
            BEDROCK_BASE_URL,
            BEDROCK_MODEL,
            bedrock_token_provider(BEDROCK_REGION),
            timeout_seconds=60,
        )
    raise ValueError(f"Unbekanntes Ziel: {target}")


def main(argv: Sequence[str], model_factory: Callable[[str], LanguageModel] = build_model) -> int:
    """Lässt die Testsammlung gegen das gewählte Ziel laufen und druckt die Zusammenfassung."""
    parser = argparse.ArgumentParser(description="Testsammlung des Bots")
    parser.add_argument("--target", choices=["lmstudio", "bedrock"], default="lmstudio")
    parser.add_argument("--cases", type=Path, default=CASES_FILE)
    arguments = parser.parse_args(argv)
    model = model_factory(arguments.target)
    classifier = IntentClassifier(model, load_prompt("intent"))
    answerer = GeneralAnswerer(model, load_prompt("general_answer"))
    results = [run_case(case, classifier, answerer) for case in load_cases(arguments.cases)]
    print(summarize(results))
    return 0


if __name__ == "__main__":  # pragma: no cover - Einstieg, wird per Skript gestartet
    sys.exit(main(sys.argv[1:]))
