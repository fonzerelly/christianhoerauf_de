import csv
import io
import os
import subprocess
import zipfile
from pathlib import Path

import pytest

BACKEND_DIR = Path(__file__).parent.parent
PACKAGE_ZIP = BACKEND_DIR / "build" / "lambda.zip"


def run_build(knowledge_base: Path | None = None) -> subprocess.CompletedProcess[str]:
    """Baut das Paket; `knowledge_base` ersetzt die echte Wissensbasis (für die Testperson)."""
    env = dict(os.environ)
    if knowledge_base is not None:
        env["WISSENSBASIS_DIR"] = str(knowledge_base)
    return subprocess.run(
        [BACKEND_DIR / "scripts" / "build_package.sh"], capture_output=True, text=True, env=env
    )


def build_package(knowledge_base: Path | None = None) -> list[str]:
    run_build(knowledge_base).check_returncode()
    with zipfile.ZipFile(PACKAGE_ZIP) as package:
        return package.namelist()


# Erfundene Testperson; die echte Wissensbasis kommt nie in Tests.
def text(body: str = "Erika backt.") -> str:
    return f"---\ntitel: Bäckerin\n---\n{body}\n"


KNOWLEDGE_FILES = [
    "wissensbasis/anekdoten/brezel.md",
    "wissensbasis/projekte/kuchen.md",
    "wissensbasis/stationen/sonnenschein.md",
]


def write_knowledge_base(base: Path) -> None:
    """Je ein Text in den drei Ordnern, die der Bot liest."""
    for name in KNOWLEDGE_FILES:
        path = base / name.removeprefix("wissensbasis/")
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(text(), encoding="utf-8")


def test_package_contains_stations_projects_and_anecdotes(tmp_path: Path) -> None:
    write_knowledge_base(tmp_path)

    names = build_package(tmp_path)

    assert [name for name in names if name.startswith("wissensbasis/")] == KNOWLEDGE_FILES


def dependency_files(names: list[str]) -> set[str]:
    """Alle Dateien, die eine Abhängigkeit in ihrer Liste der installierten Dateien
    (`*.dist-info/RECORD`, eine CSV-Datei mit dem Pfad in der ersten Spalte) selbst aufführt."""
    with zipfile.ZipFile(PACKAGE_ZIP) as package:
        records = [name for name in names if name.endswith(".dist-info/RECORD")]
        return {
            row[0]
            for record in records
            for row in csv.reader(io.StringIO(package.read(record).decode("utf-8")))
            if row
        }


def test_package_holds_only_code_dependencies_and_the_three_knowledge_folders(
    tmp_path: Path,
) -> None:
    # Neben den drei Ordnern liegt alles, was es in der Wissensbasis sonst gibt: Nichts davon darf
    # ins Paket (`roh/` enthält Diktate mit Noten), ebenso wenig irgendetwas außerhalb von backend/
    # (Lebenslauf, private Angaben, Kontaktdaten, Bewerbungen). Darum eine Positivliste.
    write_knowledge_base(tmp_path)
    for folder in ("roh", "entwuerfe", ".obsidian"):
        (tmp_path / folder).mkdir()
        (tmp_path / folder / "notiz.md").write_text(text(), encoding="utf-8")
    (tmp_path / "lose.md").write_text(text(), encoding="utf-8")
    (tmp_path / "varianten.yaml").write_text("schalter: {}\n", encoding="utf-8")

    names = build_package(tmp_path)

    allowed = dependency_files(names)
    stray = [
        name
        for name in names
        if not name.startswith(("bot/", "wissensbasis/"))
        and name not in allowed
        and name != "lebenslauf/varianten.yaml"
    ]
    assert stray == []
    assert [name for name in names if name.startswith("wissensbasis/")] == KNOWLEDGE_FILES


@pytest.mark.parametrize("folder", ["stationen", "projekte", "anekdoten"])
def test_a_text_with_open_questions_stops_the_build(tmp_path: Path, folder: str) -> None:
    write_knowledge_base(tmp_path)
    (tmp_path / folder / "offen.md").write_text(
        text("Erika backt. (offen: seit wann?)"), encoding="utf-8"
    )

    result = run_build(tmp_path)

    assert result.returncode != 0
    assert f"{folder}/offen.md" in result.stderr


def test_package_contains_handler_but_no_docs_or_dspy() -> None:
    names = build_package()

    assert "bot/handler.py" in names
    assert not any(name.endswith("doc.md") for name in names)
    assert not any(name.lower().startswith("dspy") for name in names)


# Mit boto3 rund 16 MiB; Grenze bei Lambda: 50 MB als ZIP-Upload.
def test_package_is_well_below_the_lambda_size_limit() -> None:
    build_package()

    assert PACKAGE_ZIP.stat().st_size < 25 * 1024 * 1024


def test_package_contains_prompts_variants_boto3_and_pyyaml() -> None:
    names = build_package()

    assert "bot/pipeline/prompts/intent_program.json" in names
    assert "lebenslauf/varianten.yaml" in names  # für den Lebenslauf-Endpunkt
    assert any(name.startswith("yaml/") for name in names)  # PyYAML liest varianten.yaml
    assert "bot/pipeline/prompts/general_answer.md" in names
    assert "bot/pipeline/prompts/task_answer.md" in names
    assert any(name.startswith("boto3/") for name in names)
    assert not any(name.startswith("testsammlung") for name in names)
