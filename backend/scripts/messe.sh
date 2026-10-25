#!/usr/bin/env bash
# Misst den Türsteher des Bots mit allen Testfragen gegen LM Studio auf dem Mac mini (etwa 5 min)
# und schreibt testsammlung/kompilat/messung.json. Exit 0 bestanden, 1 nicht bestanden.
set -euo pipefail
cd "$(dirname "$0")/.."
uv sync --locked --quiet
exec uv run --no-sync python -m testsammlung.measurement
