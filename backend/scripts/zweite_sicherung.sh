#!/usr/bin/env bash
# Stellt die Testfragen, die eine feste Reaktion brauchen, direkt Gemma auf dem Mac mini, am
# Türsteher vorbei, dazu harmlose Grenzfragen (etwa 10 min). Druckt die Zusammenfassung und legt
# sie zusätzlich in tmp/ ab, zum Vergleich vor und nach einer Änderung an den Antwort-Prompts.
set -euo pipefail
cd "$(dirname "$0")/.."
uv sync --locked --inexact --quiet
mkdir -p tmp
uv run --no-sync python -m testsammlung.backstop "$@" | tee "tmp/zweite_sicherung_$(date +%F_%H%M).txt"
