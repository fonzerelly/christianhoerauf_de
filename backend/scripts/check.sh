#!/usr/bin/env bash
# Prüft alles auf einmal: Format, Lint, Typen, Unit-Tests mit 100 % Abdeckung, Architektur.
# Bricht beim ersten Fehler ab. Aufruf aus beliebigem Verzeichnis.
set -euo pipefail
cd "$(dirname "$0")/.."

# --locked: die Lock-Datei muss zu pyproject.toml passen. Ohne Gruppe dspy (nur zum Entwickeln).
uv sync --locked

echo "== ruff format =="
uv run --no-sync ruff format --check .
echo "== ruff lint =="
uv run --no-sync ruff check .
echo "== mypy =="
uv run --no-sync mypy
echo "== pytest (Abdeckung 100 %) =="
uv run --no-sync pytest
echo "== import-linter (Architektur) =="
PYTHONPATH=src uv run --no-sync lint-imports
echo "Alles in Ordnung."
