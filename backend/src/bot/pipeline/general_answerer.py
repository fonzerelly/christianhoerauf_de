from bot.ports.language_model import LanguageModel, Message


class GeneralAnswerer:
    """Beantwortet eine allgemeine Frage mit einem Modellaufruf und dem handgeschriebenen Prompt."""

    def __init__(self, model: LanguageModel, system_prompt: str) -> None:
        self._model = model
        self._system_prompt = system_prompt

    def answer(self, question: str) -> str:
        """Der rohe Antworttext des Modells (Länge und Emojis prüft später `check_reply`)."""
        messages: list[Message] = [
            {"role": "system", "content": self._system_prompt},
            {"role": "user", "content": question},
        ]
        return self._model.complete(messages)
