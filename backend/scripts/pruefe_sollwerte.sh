#!/usr/bin/env bash
# Misst das Stichwort an Christians Sollwerten: Gemma beantwortet die Fragen aus
# docs/backend/antwort-prompt/sollwerte_stichwort.yaml mit dem aktuellen Prompt; ein Treffer zählt
# 1, sonst vergleicht Kev (DGX) das Stichwort mit dem ersten Sollwert. Etwa 2 Minuten je Runde.
# Aufruf:  scripts/pruefe_sollwerte.sh                                  alle 80 Fragen, DGX, 1 Runde
#          scripts/pruefe_sollwerte.sh --fragen ../docs/backend/antwort-prompt/fragen_probe.yaml
#          scripts/pruefe_sollwerte.sh --prompt versuche/x.md --runden 3 --ziel macmini
# Einzelheiten landen in versuche/eichung.sollwerte.json (oder --aus DATEI).
set -euo pipefail
cd "$(dirname "$0")/.."
uv sync --locked --inexact --quiet  # --inexact: lässt DSPy eines laufenden Trainings stehen
exec uv run --no-sync python -m testsammlung.calibration sollwerte "$@"
