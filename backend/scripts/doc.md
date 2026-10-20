# scripts

Hilfsskripte. Aufruf aus beliebigem Verzeichnis, sie wechseln selbst nach `backend/`.

| Skript | Was es konkret tut |
|---|---|
| `check.sh` | Führt nacheinander aus: `uv sync --locked`, `ruff format --check`, `ruff check`, `mypy`, `pytest` (bricht unter 100 % Zeilen- und Zweigabdeckung ab), `lint-imports` (Architekturtest). Bricht beim ersten Fehler ab. |
| `build_package.sh` | Baut `build/lambda.zip`. Exportiert die Laufzeitabhängigkeiten aus `uv.lock` (ohne Gruppen `dev` und `dspy`), installiert sie als Linux-arm64-Räder (Python 3.14) nach `build/package`, kopiert `src/bot` dazu (ohne `__pycache__` und `doc.md`), packt alles mit fester Reihenfolge und Zeitstempel in ein ZIP und gibt ZIP- und entpackte Größe aus. Bricht ab, wenn DSPy im Paket steckt. Mit `--with PAKET==VERSION` wird ein Paket nur für eine Größenmessung hinzugenommen, ohne `pyproject.toml` oder Lock-Datei zu ändern. |
| `measure_cold_start.sh [N]` | Baut das Paket, falls nötig, und startet N-mal (Standard 5) einen frischen Container aus `public.ecr.aws/lambda/python:3.14` (x86_64) mit dem Paket unter `/var/task`. Ruft den Handler einmal über den eingebauten Runtime Interface Emulator auf und gibt die Init-Dauer (Python starten, Handler importieren) und die Dauer des ersten Aufrufs aus. Räumt Container und temporäres Verzeichnis selbst auf. Kein AWS-Zugriff. |
