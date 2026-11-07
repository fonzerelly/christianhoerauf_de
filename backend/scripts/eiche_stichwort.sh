#!/usr/bin/env bash
# Eicht den Richter für das Stichwort: Qwen auf der DGX beurteilt die 49 Stichwörter aus
# docs/backend/antwort-prompt/eichung_stichwort.yaml nach K13, mit den Texten der Wissensbasis wie
# in der Messung; verglichen wird mit Christians Urteilen (g/s). Etwa 3 Minuten.
# Aufruf:  scripts/eiche_stichwort.sh  [--datei DATEI] [--wissensbasis ORDNER] [--aus DATEI]
# Einzelheiten landen in versuche/eichung.stichwort.json.
set -euo pipefail
cd "$(dirname "$0")/.."
uv sync --locked --quiet
exec uv run --no-sync python -m testsammlung.calibration stichwort "$@"
