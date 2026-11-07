#!/usr/bin/env bash
# Eicht den Richter für die Folgefragen: Qwen auf der DGX beurteilt die 90 Folgefragen aus
# docs/backend/antwort-prompt/eichung_richter.yaml nach K17 (verständlich ohne die Antwort) und
# K24 (kein schlechter Eindruck); verglichen wird mit Christians Urteilen. Etwa 6 Minuten.
# Aufruf:  scripts/eiche_richter.sh  [--datei DATEI] [--aus DATEI]
# Einzelheiten landen in versuche/eichung.richter.json.
set -euo pipefail
cd "$(dirname "$0")/.."
uv sync --locked --quiet
exec uv run --no-sync python -m testsammlung.calibration richter "$@"
