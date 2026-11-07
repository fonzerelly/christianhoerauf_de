#!/usr/bin/env bash
# Misst die Antworten aus der Wissensbasis mit Stichwort und Folgefragen: Gemma antwortet auf dem
# Ziel, Qwen auf der DGX bewertet (Kriterien: docs/backend/antwort-prompt/KRITERIEN.md).
# Aufruf:  scripts/messe_antworten.sh                         Mac mini, Prüffragen, 1 Runde
#          scripts/messe_antworten.sh --ziel bedrock           Bedrock (Kosten, nur von Hand)
#          scripts/messe_antworten.sh --prompt versuche/x.md   eine andere Fassung des Prompts
#          scripts/messe_antworten.sh --teil alle --runden 3
# Einzelheiten landen in versuche/antworten.<ziel>.json (oder --aus DATEI).
set -euo pipefail
cd "$(dirname "$0")/.."
uv sync --locked --inexact --quiet  # --inexact: lässt DSPy eines laufenden Trainings stehen
exec uv run --no-sync python -m testsammlung.answer_measurement "$@"
