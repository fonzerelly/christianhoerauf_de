"""Phase 1 des Integrationstests „Besucherpfade“: Aufzeichnen mit Gemma in LM Studio.

Derselbe Bot wie im Lambda (`assemble_bot`), Zähler im Arbeitsspeicher. Der Türsteher stuft jede
angezeigte Folgefrage zusätzlich ein (K18), denn beim Anklicken umgeht der Bot ihn. Gemma spielt
auch den Besucher, der eigene Rückfragen stellt: So braucht diese Phase nur ein Modell. Bedrock
ist nicht wählbar, der Test soll nichts kosten.

Aufruf: python -m testsammlung.visitor_recording [--ziel dgx] [--tiefe 2] [--persona NAME …]
"""

import argparse
import re
import sys
from collections.abc import Iterator, Mapping, Sequence
from pathlib import Path

from bot.adapters.memory_store import MemoryStore
from bot.handler import assemble_bot, language_model
from bot.pipeline.bot import Bot
from bot.pipeline.intent_classifier import GATE_MAX_TOKENS, GATE_TEMPERATURE, IntentClassifier
from bot.pipeline.prompts import load_intent_program
from bot.ports.language_model import LanguageModel, LanguageModelError
from testsammlung.local_backend import local_environ
from testsammlung.targets import DEFAULT_TARGET, LM_STUDIO_HOSTS
from testsammlung.visitor_paths import Ask, Classify, Invent, Node, explore, write_nodes
from testsammlung.visitor_scenarios import load_personas

BACKEND = Path(__file__).resolve().parents[1]
DEFAULT_SCENARIOS = BACKEND.parent / "docs/backend/antwort-prompt/besucherpfade.yaml"
DEFAULT_DEPTH = 2
VISITOR_MAX_TOKENS = 200
GATE_FAILED = "ausgefallen"

# Gemma als Besucher: zwei Rückfragen, wie Menschen sie nach einer Antwort tippen. Die erste
# verlässt das Thema Chris (Begriff), die zweite bezieht sich nur mit „das“ oder „dort“ zurück;
# beides kann der Bot ohne Gesprächsverlauf nicht zuordnen (ADR 0004).
VISITOR_PROMPT = """\
Du spielst einen Besucher auf der Webseite von Chris. Dort beantwortet ein Chatbot Fragen über \
Chris. Du hast gerade eine Frage gestellt und die Antwort gelesen.

Schreib genau zwei kurze Rückfragen, wie ein Mensch sie danach eintippen würde, je eine Zeile, \
ohne Nummern und ohne weiteren Text:
1. Eine Frage nach einem Begriff, Ort oder Fachwort, das in der Antwort vorkommt.
2. Eine Rückfrage zum Inhalt der Antwort, die sich nur mit „das“, „dort“ oder „er“ darauf \
bezieht, ohne einen Namen zu nennen."""

_LIST_MARKER = re.compile(r"^\s*(?:[-*•]|\d+[.)])\s*")


class RecordingLog:
    """Das Protokoll des Bots; merkt sich den letzten Eintrag."""

    def __init__(self) -> None:
        self.last: Mapping[str, object] = {}

    def write(self, record: Mapping[str, object]) -> None:
        self.last = record


def bot_asker(bot: Bot, log: RecordingLog) -> Ask:
    """Stellt dem Bot eine Frage als `visitor` und gibt seinen Protokolleintrag zurück. Der
    Besucher steht dort, wo der Bot sonst die IP-Adresse bekommt."""

    def ask(question: str, visitor: str) -> Mapping[str, object]:
        bot.ask(question, visitor)
        return log.last

    return ask


def gate_intent(classifier: IntentClassifier) -> Classify:
    """Das Kürzel der Absicht, die der Türsteher einer Frage gibt; „ausgefallen“, wenn das Modell
    nicht antwortet."""

    def classify(question: str) -> str:
        try:
            return classifier.classify(question).value
        except LanguageModelError:
            return GATE_FAILED

    return classify


def visitor_questions(model: LanguageModel) -> Invent:
    """Die Rückfragen, die `model` als Besucher nach Frage und Antwort stellt (`VISITOR_PROMPT`):
    jede Zeile, die auf „?“ endet, ohne Aufzählungszeichen. Fällt das Modell aus, keine."""

    def invent(question: str, answer: str) -> list[str]:
        try:
            reply = model.complete(
                [
                    {"role": "system", "content": VISITOR_PROMPT},
                    {"role": "user", "content": f"Deine Frage: {question}\nAntwort: {answer}"},
                ]
            )
        except LanguageModelError:
            return []
        lines = (_LIST_MARKER.sub("", line).strip() for line in reply.splitlines())
        return [line for line in lines if line.endswith("?")]

    return invent


def main(argv: Sequence[str]) -> int:
    """Liest die Optionen, baut Bot, Türsteher und Besucher mit Gemma auf `--ziel`, zeichnet alle
    Pfade auf und schreibt sie nach `--aus`. Ein unbekanntes Ziel oder eine unbekannte Persona:
    Exit 2 von argparse. Sonst 0."""
    parser = argparse.ArgumentParser(description="Besucherpfade aufzeichnen (Phase 1)")
    parser.add_argument("--ziel", choices=list(LM_STUDIO_HOSTS), default=DEFAULT_TARGET)
    parser.add_argument("--tiefe", type=int, default=DEFAULT_DEPTH)
    parser.add_argument("--persona", action="append", default=[])
    parser.add_argument("--szenarien", type=Path, default=DEFAULT_SCENARIOS)
    parser.add_argument("--wissensbasis", type=Path, default=BACKEND / "wissensbasis")
    parser.add_argument("--aus", type=Path)
    args = parser.parse_args(argv)

    personas = load_personas(args.szenarien)
    unknown = sorted(set(args.persona) - {persona.name for persona in personas})
    if unknown:
        parser.error(f"Unbekannte Persona: {', '.join(unknown)}")
    personas = [persona for persona in personas if persona.name in args.persona or not args.persona]
    out = args.aus or BACKEND / f"versuche/besucherpfade/aufzeichnung.{args.ziel}.jsonl"

    environ = local_environ(args.ziel, args.wissensbasis, BACKEND / "lebenslauf")
    log = RecordingLog()
    bot = assemble_bot(environ, MemoryStore(), log)
    gate = IntentClassifier(
        language_model(environ, GATE_TEMPERATURE, GATE_MAX_TOKENS), load_intent_program()
    )
    visitor = language_model(environ, max_tokens=VISITOR_MAX_TOKENS)

    nodes = explore(
        personas, bot_asker(bot, log), gate_intent(gate), visitor_questions(visitor), args.tiefe
    )
    count = 0

    def printed(nodes: Iterator[Node]) -> Iterator[Node]:
        nonlocal count
        for node in nodes:
            count += 1
            record = node.record
            print(
                f"{node.number:4} {node.persona:<16} {node.kind:<10} "
                f"{record.get('intent')} → {record.get('outcome')} "
                f"{record.get('duration_ms')} ms  {node.question}",
                flush=True,
            )
            yield node

    write_nodes(printed(nodes), out)
    print(f"{count} Fragen aufgezeichnet in {out}")
    return 0


# Am Dateiende, damit beim direkten Aufruf alle Funktionen schon definiert sind.
if __name__ == "__main__":  # pragma: no cover
    sys.exit(main(sys.argv[1:]))
