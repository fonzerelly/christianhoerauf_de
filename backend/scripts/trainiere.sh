#!/usr/bin/env bash
# Trainiert den Türsteher mit DSPy gegen LM Studio (etwa 35 min) und exportiert ihn fürs Lambda.
# Überschreibt das alte Kompilat in testsammlung/kompilat/. Danach: messe.sh.
# Aufruf:  scripts/trainiere.sh            Training und Export auf dem Mac mini
#          scripts/trainiere.sh --ziel dgx     dasselbe auf der DGX Spark (nur macmini oder dgx)
#          scripts/trainiere.sh --nur-export   nur Export aus dem vorhandenen Kompilat
#          scripts/trainiere.sh --nur-pruefen  nur prüfen, ob die Bewertungsfragen ausgewogen sind
#          scripts/trainiere.sh --trotzdem     trainieren, auch wenn die Prüfung etwas findet
set -euo pipefail
cd "$(dirname "$0")/.."
uv sync --locked --group dspy --quiet
exec uv run --no-sync python -m testsammlung.training "$@"
