#!/usr/bin/env bash
# Trainiert den Prompt für Antworten aus der Wissensbasis mit GEPA: Gemma auf dem Ziel antwortet,
# Qwen auf der DGX bewertet und schreibt die Anweisung um. Ergebnis in versuche/gepa/prompt.md;
# übernommen wird nichts automatisch.
# Aufruf:  scripts/trainiere_antworten.sh                 DGX, Budget 400 Bewertungen (~4 h)
#          scripts/trainiere_antworten.sh --budget 1000   länger (über Nacht)
#          scripts/trainiere_antworten.sh --probe         Probelauf mit 2+2 Fragen
set -euo pipefail
cd "$(dirname "$0")/.."
uv sync --locked --group dspy --quiet
exec uv run --no-sync python -m testsammlung.answer_training "$@"
