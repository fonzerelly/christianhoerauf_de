from enum import Enum


class Intent(Enum):
    """Wozu eine Frage gestellt wird (CONTEXT.md: Absicht; Liste in docs/backend/ABSICHTEN.md).
    Der Wert ist das Kürzel `gruppe/absicht`, das auch der Türsteher ausgibt."""

    KNOWLEDGE = "general/knowledge"
    SMALLTALK = "general/smalltalk"
    BOT = "general/bot"
    FLIRT = "general/flirt"
    TASK = "general/task"
    ADVICE = "general/advice"
    LIVE_DATA = "general/live_data"
    POLITICS = "general/politics"
    CAREER = "christian/career"
    PRIVATE = "christian/private"
    CONTACT = "christian/contact"
    PICTURE = "christian/picture"
    SEXUAL = "sensitive/sexual"
    DANGEROUS = "sensitive/dangerous"
    INSULT = "sensitive/insult"
    JAILBREAK = "jailbreak"
    GIBBERISH = "gibberish"

    @property
    def group(self) -> str:
        """Die erste Stufe: `general`, `christian`, `sensitive`, `jailbreak` oder `gibberish`."""
        return self.value.split("/")[0]
