#!/usr/bin/env bash
# Lässt die Testsammlung laufen. Standard: LM Studio auf dem Mac mini.
# Aufruf:  scripts/run_testsammlung.sh [--ziel macmini|dgx|bedrock]
# `--ziel bedrock` ruft Bedrock in Frankfurt mit den AWS-Zugangsdaten der Umgebung auf (Kosten
# im Cent-Bereich) und ist deshalb nur von Hand zu starten.
set -euo pipefail
cd "$(dirname "$0")/.."
uv sync --locked --quiet
exec uv run --no-sync python -m testsammlung.runner "$@"
