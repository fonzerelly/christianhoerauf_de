from bot.domain.intent import Intent
from bot.ports.language_model import LanguageModel, Message

# Die Wörter, die der Prompt (prompts/intent.md) dem Modell als Antwort vorgibt.
_LABELS = {
    "general": Intent.GENERAL,
    "christian": Intent.ABOUT_CHRISTIAN,
    "gimmick": Intent.GIMMICK,
    "disallowed": Intent.DISALLOWED,
}


class IntentClassifier:
    """Bestimmt die Absicht einer Frage mit einem Modellaufruf und dem handgeschriebenen Prompt."""

    def __init__(self, model: LanguageModel, system_prompt: str) -> None:
        self._model = model
        self._system_prompt = system_prompt

    def classify(self, question: str) -> Intent:
        """Nimmt das erste der vier Wörter in der Modellantwort. Findet sich keins, gilt die Frage
        vorsichtshalber als unzulässig. Fällt das Modell aus, geht der Fehler nach oben."""
        messages: list[Message] = [
            {"role": "system", "content": self._system_prompt},
            {"role": "user", "content": question},
        ]
        reply = self._model.complete(messages).lower()
        found = {label: reply.find(label) for label in _LABELS if label in reply}
        if not found:
            return Intent.DISALLOWED
        return _LABELS[min(found, key=lambda label: found[label])]
