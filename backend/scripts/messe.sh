#!/usr/bin/env bash
# Misst den Türsteher des Bots mit allen Testfragen (etwa 5 min) und schreibt
# testsammlung/kompilat/messung.json. Exit 0 bestanden, 1 nicht bestanden.
# Aufruf:  scripts/messe.sh                   LM Studio auf dem Mac mini
#          scripts/messe.sh --ziel dgx        LM Studio auf der DGX Spark
#          scripts/messe.sh --ziel bedrock    Bedrock wie im Betrieb (AWS-Zugangsdaten, Kosten)
# Die Rechner stehen in testsammlung/targets.py.
set -euo pipefail
cd "$(dirname "$0")/.."
uv sync --locked --quiet
exec uv run --no-sync python -m testsammlung.measurement "$@"
