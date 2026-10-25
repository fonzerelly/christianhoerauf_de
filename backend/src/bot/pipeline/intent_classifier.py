import json
import re
from dataclasses import dataclass

from bot.domain.intent import Intent
from bot.ports.language_model import LanguageModel, Message

# Feldmarkierung im Format von DSPys ChatAdapter, z. B. `[[ ## absicht ## ]]`.
_FIELD_HEADER = re.compile(r"\[\[ ## (\w+) ## \]\]")
_OUTPUT_FIELD = "absicht"


@dataclass(frozen=True)
class IntentProgram:
    """Der mit DSPy optimierte Türsteher als fertige Nachrichten (ADR 0002). Systemnachricht und
    Beispielpaare stehen wörtlich darin; für jede Frage kommt nur die letzte Nachricht dazu:
    `question_prefix` + Frage + `question_suffix`. Erzeugt von
    `experiments/absichten/export_prompt.py`."""

    labels: tuple[str, ...]
    messages: tuple[Message, ...]
    question_prefix: str
    question_suffix: str

    @classmethod
    def from_json(cls, text: str) -> IntentProgram:
        """Liest den Export. Passen seine Kürzel nicht genau zu `Intent`, ist der Export veraltet
        oder der Code: `ValueError`, damit das nicht erst im Betrieb auffällt."""
        data = json.loads(text)
        labels = tuple(data["labels"])
        if labels != tuple(intent.value for intent in Intent):
            raise ValueError("Die Kürzel im Export passen nicht zu den Absichten im Code")
        messages = tuple(
            Message(role=message["role"], content=message["content"])
            for message in data["messages"]
        )
        return cls(labels, messages, data["question_prefix"], data["question_suffix"])

    def messages_for(self, question: str) -> list[Message]:
        """Alle Nachrichten an das Modell für diese Frage."""
        last: Message = {
            "role": "user",
            "content": self.question_prefix + question + self.question_suffix,
        }
        return [*self.messages, last]


def read_intent(reply: str) -> Intent:
    """Liest die Absicht aus der Modellantwort wie DSPys ChatAdapter: das erste Feld
    `[[ ## absicht ## ]]`, ohne Anführungszeichen und `Literal[...]`. Ohne Feldmarkierung zählt
    die ganze Antwort, falls sie genau ein Kürzel ist. Alles andere ist unlesbar und zählt als
    `gibberish` (Plan „Absichten neu“: nie ablehnen, nur weil die Antwort unlesbar war)."""
    value = _first_field(reply, _OUTPUT_FIELD)
    label = _unwrap(reply if value is None else value)
    try:
        return Intent(label)
    except ValueError:
        return Intent.GIBBERISH


def _first_field(reply: str, name: str) -> str | None:
    """Der Text des ersten Felds `name`: bis zur nächsten Feldmarkierung, ohne Rand-Leerraum."""
    sections: list[tuple[str | None, list[str]]] = [(None, [])]
    for line in reply.splitlines():
        header = _FIELD_HEADER.match(line.strip())
        if header:
            rest = line.strip()[header.end() :].strip()
            sections.append((header.group(1), [rest] if rest else []))
        else:
            sections[-1][1].append(line)
    for field, lines in sections:
        if field == name:
            return "\n".join(lines).strip()
    return None


def _unwrap(value: str) -> str:
    """Entfernt `Literal[...]`/`str[...]` und umschließende Anführungszeichen (wie DSPy)."""
    text = value.strip()
    if text.startswith(("Literal[", "str[")) and text.endswith("]"):
        text = text[text.find("[") + 1 : -1]
    if len(text) > 1 and text[0] == text[-1] and text[0] in "\"'":
        text = text[1:-1]
    return text


class IntentClassifier:
    """Bestimmt die Absicht einer Frage mit einem Modellaufruf und dem exportierten Programm."""

    def __init__(self, model: LanguageModel, program: IntentProgram) -> None:
        self._model = model
        self._program = program

    def classify(self, question: str) -> Intent:
        """Schickt die Nachrichten des Programms und liest die Absicht. Fällt das Modell aus,
        geht der Fehler nach oben."""
        return read_intent(self._model.complete(self._program.messages_for(question)))
