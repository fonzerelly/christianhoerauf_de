from pathlib import Path


def load_prompt(name: str) -> str:
    """Liest den handgeschriebenen Prompt `prompts/<name>.md` (UTF-8)."""
    return (Path(__file__).parent / f"{name}.md").read_text(encoding="utf-8")
