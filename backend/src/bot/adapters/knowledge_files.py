from pathlib import Path

# Nur diese Ordner der Wissensbasis liest der Bot. Alles andere, etwa `roh/` mit Diktaten und
# Noten oder `entwuerfe/`, bleibt draußen, auch wenn es im selben Ordner liegt.
KNOWLEDGE_FOLDERS = ("stationen", "projekte", "anekdoten")


def knowledge_texts(folder: Path) -> str:
    """Alle Texte aus den Ordnern KNOWLEDGE_FOLDERS unter `folder` als ein Text für den Prompt.

    Jeder Text steht samt Kopfteil unter einer Überschrift mit seinem Pfad, sortiert nach Pfad.
    Fehlt der Ordner oder ist er leer, ist das Ergebnis leer."""
    paths = sorted(path for name in KNOWLEDGE_FOLDERS for path in (folder / name).glob("*.md"))
    return "\n".join(
        f"# {path.relative_to(folder).as_posix()}\n\n{path.read_text(encoding='utf-8')}"
        for path in paths
    )
