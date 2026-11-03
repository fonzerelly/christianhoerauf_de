#!/usr/bin/env bash
# Würfeltest des Türstehers: jede Frage aus testsammlung/wuerfelfragen.yaml mehrmals mit
# Temperatur 1. Zeigt, wie sicher das Modell bei jeder Frage ist.
# Aufruf:  scripts/wuerfle.sh                                Mac mini, 20 Mal je Frage
#          scripts/wuerfle.sh --ziel bedrock --anzahl 5      Bedrock (Kosten), 5 Mal
#          scripts/wuerfle.sh --tuersteher versuche/x.json   eine Variante des Türstehers
set -euo pipefail
cd "$(dirname "$0")/.."
uv sync --locked --quiet
exec uv run --no-sync python -m testsammlung.sampling "$@"
