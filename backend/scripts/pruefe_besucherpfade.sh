#!/usr/bin/env bash
# Integrationstest „Besucherpfade“ (docs/backend/INTEGRATIONSTEST.md): Personas fragen, klicken
# Folgefragen und stellen eigene Rückfragen. Nur LM Studio, nie Bedrock: Der Test kostet nichts.
# Zwei Schritte, damit Gemma und Qwen nicht zugleich geladen sein müssen:
#   1. aufzeichnen: Gemma antwortet, Türsteher und Besucher sind auch Gemma.
#   2. bewerten:    feste Regeln, dann Qwen als Richter.
#
# Aufruf:  scripts/pruefe_besucherpfade.sh                     beide Schritte auf der DGX
#          scripts/pruefe_besucherpfade.sh --tiefe 1 --persona personalerin
#          scripts/pruefe_besucherpfade.sh aufzeichnen --ziel macmini
#          scripts/pruefe_besucherpfade.sh bewerten versuche/besucherpfade/aufzeichnung.macmini.jsonl --richter macmini
# Auf dem Mac mini zwischen den Schritten in LM Studio Gemma entladen und Qwen laden.
# Aufzeichnung und Befunde landen in versuche/besucherpfade/ (aufzeichnung.<ziel>.jsonl und
# aufzeichnung.<ziel>.bewertung.json). Exit 0: kein Muss-Verstoß, 1: Muss-Verstöße, 2: Aufruf falsch.
set -euo pipefail
cd "$(dirname "$0")/.."
uv sync --locked --inexact --quiet  # --inexact: lässt DSPy eines laufenden Trainings stehen
run="uv run --no-sync python -u -m"

case "${1:-}" in
  aufzeichnen)
    shift
    exec $run testsammlung.visitor_recording "$@"
    ;;
  bewerten)
    shift
    exec $run testsammlung.visitor_review "$@"
    ;;
  *)
    $run testsammlung.visitor_recording --ziel dgx "$@"
    exec $run testsammlung.visitor_review versuche/besucherpfade/aufzeichnung.dgx.jsonl --richter dgx
    ;;
esac
