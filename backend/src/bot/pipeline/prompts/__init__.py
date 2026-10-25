from pathlib import Path

from bot.pipeline.intent_classifier import IntentProgram

_PROMPTS = Path(__file__).parent


def load_prompt(name: str) -> str:
    """Liest den handgeschriebenen Prompt `prompts/<name>.md` (UTF-8)."""
    return (_PROMPTS / f"{name}.md").read_text(encoding="utf-8")


def load_intent_program() -> IntentProgram:
    """Liest den exportierten Türsteher `prompts/intent_program.json`."""
    return IntentProgram.from_json((_PROMPTS / "intent_program.json").read_text(encoding="utf-8"))
