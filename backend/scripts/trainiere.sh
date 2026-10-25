#!/usr/bin/env bash
# Trainiert den Türsteher mit DSPy gegen LM Studio auf dem Mac mini (etwa 25 min) und exportiert
# ihn fürs Lambda. Überschreibt das alte Kompilat in testsammlung/kompilat/. Danach: messe.sh.
# Aufruf:  scripts/trainiere.sh            Training und Export
#          scripts/trainiere.sh --nur-export   nur Export aus dem vorhandenen Kompilat
set -euo pipefail
cd "$(dirname "$0")/.."
uv sync --locked --group dspy --quiet
exec uv run --no-sync python -m testsammlung.training "$@"
