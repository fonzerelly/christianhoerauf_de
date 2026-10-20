import subprocess
import zipfile
from pathlib import Path

BACKEND_DIR = Path(__file__).parent.parent
PACKAGE_ZIP = BACKEND_DIR / "build" / "lambda.zip"


def build_package() -> list[str]:
    subprocess.run([BACKEND_DIR / "scripts" / "build_package.sh"], check=True, capture_output=True)
    with zipfile.ZipFile(PACKAGE_ZIP) as package:
        return package.namelist()


def test_package_contains_handler_but_no_docs_or_dspy() -> None:
    names = build_package()

    assert "bot/handler.py" in names
    assert not any(name.endswith("doc.md") for name in names)
    assert not any(name.lower().startswith("dspy") for name in names)


# Mit boto3 rund 16 MiB; Grenze bei Lambda: 50 MB als ZIP-Upload.
def test_package_is_well_below_the_lambda_size_limit() -> None:
    build_package()

    assert PACKAGE_ZIP.stat().st_size < 25 * 1024 * 1024
