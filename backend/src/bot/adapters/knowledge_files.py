from pathlib import Path

_RELEASED = "freigegeben: ja"


def released_texts(folder: Path) -> str:
    """Alle freigegebenen Texte der Wissensbasis unter `folder` als ein Text für den Prompt.

    Freigegeben ist eine Markdown-Datei, deren Kopfteil die Zeile `freigegeben: ja` hat. Jeder Text
    steht samt Kopfteil unter einer Überschrift mit seinem Pfad, sortiert nach Pfad. Fehlt der
    Ordner oder ist nichts freigegeben, ist das Ergebnis leer."""
    if not folder.is_dir():
        return ""
    texts = []
    for path in sorted(folder.rglob("*.md")):
        text = path.read_text(encoding="utf-8")
        if _is_released(text):
            texts.append(f"# {path.relative_to(folder).as_posix()}\n\n{text}")
    return "\n".join(texts)


def _is_released(text: str) -> bool:
    """Steht `freigegeben: ja` im Kopfteil (zwischen den ersten beiden `---`-Zeilen)?"""
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return False
    for line in lines[1:]:
        if line.strip() == "---":
            return False
        if line.strip() == _RELEASED:
            return True
    return False
