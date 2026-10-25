#!/usr/bin/env bash
# Zeigt, ob Training und Messung des Türstehers zum Stand im Repo passen und ob die Messung
# bestanden ist. Ohne Netz, dauert eine Sekunde. Dasselbe prüfen die Git-Hooks.
set -euo pipefail
cd "$(dirname "$0")/.."
exec uv run --no-sync --quiet python -m testsammlung.fingerprint
