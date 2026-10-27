from pathlib import Path

from bot.adapters.knowledge_files import released_texts

# Erfundene Testperson; die echte Wissensbasis kommt nie in Tests.
RELEASED = """---
art: station
titel: Bäckerei Sonnenschein
zeitraum: 2001 – 2005
freigegeben: ja
---
Erika war vier Jahre Bäckerin bei der Bäckerei Sonnenschein.
"""

NOT_RELEASED = """---
art: station
titel: Konditorei Mond
freigegeben: nein
---
Erika war Konditorin. (offen: wie lange?)
"""

WITHOUT_HEADER = "Erika mag Brezeln.\n"


def write(folder: Path, name: str, text: str) -> None:
    folder.mkdir(parents=True, exist_ok=True)
    (folder / name).write_text(text, encoding="utf-8")


def test_only_released_texts_are_read(tmp_path: Path) -> None:
    write(tmp_path / "stationen", "sonnenschein.md", RELEASED)
    write(tmp_path / "stationen", "mond.md", NOT_RELEASED)
    write(tmp_path / "roh", "notiz.md", WITHOUT_HEADER)

    assert released_texts(tmp_path) == f"# stationen/sonnenschein.md\n\n{RELEASED}"


def test_released_texts_are_sorted_by_path_and_separated(tmp_path: Path) -> None:
    write(tmp_path / "stationen", "b.md", RELEASED)
    write(tmp_path / "stationen", "a.md", RELEASED)

    assert released_texts(tmp_path) == (
        f"# stationen/a.md\n\n{RELEASED}\n# stationen/b.md\n\n{RELEASED}"
    )


def test_a_missing_folder_gives_no_texts(tmp_path: Path) -> None:
    assert released_texts(tmp_path / "fehlt") == ""


def test_released_only_counts_in_the_header(tmp_path: Path) -> None:
    write(tmp_path, "text.md", "---\nart: station\n---\nfreigegeben: ja\n")
    write(tmp_path, "offen.md", "---\nart: station\n")

    assert released_texts(tmp_path) == ""
