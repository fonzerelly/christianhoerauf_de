import json
import os
import subprocess
from pathlib import Path

SCRIPTS_DIR = Path(__file__).parent.parent / "scripts"

# 22.10.2026 14:03:05 Uhr in Berlin (Sommerzeit, UTC+2)
TIMESTAMP_MS = 1792670585000


def run_with_fake_aws(script: str, tmp_path: Path, messages: list[str], *args: str) -> str:
    """Startet scripts/<script> mit einem falschen `aws` vorn im PATH und gibt die Ausgabe
    zurück. Das falsche `aws` merkt sich seine Argumente in tmp_path/args und gibt aus, was
    `aws logs filter-log-events --query 'events[].[timestamp,message]' --output json`
    mit diesen Protokollzeilen liefern würde. Kein Zugriff auf AWS."""
    events = json.dumps([[TIMESTAMP_MS, m + "\n"] for m in messages], ensure_ascii=False)
    fake_aws = tmp_path / "aws"
    fake_aws.write_text(
        f"#!/usr/bin/env bash\necho \"$@\" > {tmp_path}/args\ncat <<'EOF'\n{events}\nEOF\n"
    )
    fake_aws.chmod(0o755)
    env = {**os.environ, "PATH": f"{tmp_path}:{os.environ['PATH']}"}
    result = subprocess.run(
        [SCRIPTS_DIR / script, *args], env=env, capture_output=True, text=True, check=True
    )
    return result.stdout


def start_time_seconds(tmp_path: Path) -> int:
    """Der Wert von --start-time, mit dem das Skript `aws` aufgerufen hat, in Sekunden."""
    args = (tmp_path / "args").read_text()
    return int(args.split("--start-time ")[1].split()[0]) // 1000
