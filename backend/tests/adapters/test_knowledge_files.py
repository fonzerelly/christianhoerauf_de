from pathlib import Path

from bot.adapters.knowledge_files import knowledge_texts

# Erfundene Testperson; die echte Wissensbasis kommt nie in Tests.
STATION = """---
titel: Bäckerin
organisation: Bäckerei Sonnenschein
von: "2001"
bis: "2005"
---
Erika war vier Jahre Bäckerin bei der Bäckerei Sonnenschein.
"""

PROJECT = """---
titel: Kuchenrechner
station: "[[sonnenschein]]"
---
Erika rechnet Kuchen.
"""

ANECDOTE = """---
titel: Die Brezel im Ofen
---
Einmal vergaß Erika eine Brezel im Ofen.
"""

NOTE = "Rohes Diktat mit Noten.\n"


def write(folder: Path, name: str, text: str) -> None:
    folder.mkdir(parents=True, exist_ok=True)
    (folder / name).write_text(text, encoding="utf-8")


def test_reads_stations_projects_and_anecdotes_and_nothing_else(tmp_path: Path) -> None:
    write(tmp_path / "stationen", "sonnenschein.md", STATION)
    write(tmp_path / "projekte", "kuchen.md", PROJECT)
    write(tmp_path / "anekdoten", "brezel.md", ANECDOTE)
    write(tmp_path / "roh", "diktat.md", NOTE)
    write(tmp_path / "entwuerfe", "idee.md", NOTE)
    write(tmp_path, "lose.md", NOTE)

    assert knowledge_texts(tmp_path) == (
        f"# anekdoten/brezel.md\n\n{ANECDOTE}\n"
        f"# projekte/kuchen.md\n\n{PROJECT}\n"
        f"# stationen/sonnenschein.md\n\n{STATION}"
    )


def test_texts_are_sorted_by_path(tmp_path: Path) -> None:
    write(tmp_path / "stationen", "b.md", STATION)
    write(tmp_path / "stationen", "a.md", STATION)

    assert knowledge_texts(tmp_path) == (
        f"# stationen/a.md\n\n{STATION}\n# stationen/b.md\n\n{STATION}"
    )


def test_a_missing_folder_gives_no_texts(tmp_path: Path) -> None:
    assert knowledge_texts(tmp_path / "fehlt") == ""
