import os
import subprocess
import zipfile
from pathlib import Path

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
def station(released: str, body: str = "Erika backt.") -> str:
    return f"---\nart: station\ntitel: Bäckerei\nfreigegeben: {released}\n---\n{body}\n"


def test_package_contains_only_the_released_stations(tmp_path: Path) -> None:
    (tmp_path / "stationen").mkdir()
    (tmp_path / "stationen" / "frei.md").write_text(station("ja"), encoding="utf-8")
    (tmp_path / "stationen" / "gesperrt.md").write_text(station("nein"), encoding="utf-8")

    names = build_package(tmp_path)

    assert [name for name in names if name.startswith("wissensbasis/")] == [
        "wissensbasis/stationen/frei.md"
    ]


def test_a_released_text_with_open_questions_stops_the_build(tmp_path: Path) -> None:
    (tmp_path / "stationen").mkdir()
    (tmp_path / "stationen" / "frei.md").write_text(
        station("ja", "Erika backt. (offen: seit wann?)"), encoding="utf-8"
    )

    result = run_build(tmp_path)

    assert result.returncode != 0
    assert "stationen/frei.md" in result.stderr


def test_package_contains_handler_but_no_docs_or_dspy() -> None:
    names = build_package()

    assert "bot/handler.py" in names
    assert not any(name.endswith("doc.md") for name in names)
    assert not any(name.lower().startswith("dspy") for name in names)


# Mit boto3 rund 16 MiB; Grenze bei Lambda: 50 MB als ZIP-Upload.
def test_package_is_well_below_the_lambda_size_limit() -> None:
    build_package()

    assert PACKAGE_ZIP.stat().st_size < 25 * 1024 * 1024


def test_package_contains_the_prompts_and_boto3() -> None:
    names = build_package()

    assert "bot/pipeline/prompts/intent_program.json" in names
    assert "bot/pipeline/prompts/general_answer.md" in names
    assert "bot/pipeline/prompts/task_answer.md" in names
    assert any(name.startswith("boto3/") for name in names)
    assert not any(name.startswith("testsammlung") for name in names)
