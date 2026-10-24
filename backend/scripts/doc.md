# scripts

Hilfsskripte. Aufruf aus beliebigem Verzeichnis, sie wechseln selbst nach `backend/`.

| Skript | Was es konkret tut |
|---|---|
| `check.sh` | Führt nacheinander aus: `uv sync --locked`, `ruff format --check`, `ruff check`, `mypy`, `pytest` (bricht unter 100 % Zeilen- und Zweigabdeckung ab), `lint-imports` (Architekturtest). Bricht beim ersten Fehler ab. |
| `build_package.sh` | Baut `build/lambda.zip`. Exportiert die Laufzeitabhängigkeiten aus `uv.lock` (ohne Gruppen `dev` und `dspy`), installiert sie als Linux-arm64-Räder (Python 3.14) nach `build/package`, kopiert `src/bot` dazu (ohne `__pycache__` und `doc.md`), packt alles mit fester Reihenfolge und Zeitstempel in ein ZIP und gibt ZIP- und entpackte Größe aus. Bricht ab, wenn DSPy im Paket steckt. Mit `--with PAKET==VERSION` wird ein Paket nur für eine Größenmessung hinzugenommen, ohne `pyproject.toml` oder Lock-Datei zu ändern. |
| `measure_cold_start.sh [N]` | Baut das Paket, falls nötig, und startet N-mal (Standard 5) einen frischen Container aus `public.ecr.aws/lambda/python:3.14` (x86_64) mit dem Paket unter `/var/task`. Ruft den Handler einmal über den eingebauten Runtime Interface Emulator auf und gibt die Init-Dauer (Python starten, Handler importieren) und die Dauer des ersten Aufrufs aus. Räumt Container und temporäres Verzeichnis selbst auf. Kein AWS-Zugriff. |

## protokoll.sh [TAGE]

Holt mit `aws logs filter-log-events` alle Protokollzeilen der Lambda
`christianhoerauf-bot` aus den letzten TAGE Tagen (Standard 2), die eine Frage enthalten. `jq`
zerlegt sie und gibt je Frage aus: Uhrzeit (Berlin), erkannte Absicht (`–`, wenn keine), Ausgang,
Dauer, Besucherkürzel, dann Frage (`F:`) und Antwort (`A:`). Am Ende steht, wie viele Fragen von
wie vielen verschiedenen Besuchern kamen. Zeilen ohne Frage oder ohne JSON werden übersprungen.
Braucht `aws` mit Zugangsdaten und `jq`. Der Zugriff ist nur lesend und kostet nichts.

## fehler.sh [TAGE]

Fehlerbericht. Holt alle Protokollzeilen der Lambda `christianhoerauf-bot` aus den letzten TAGE
Tagen (Standard 2) und gibt mit `jq` drei Abschnitte aus:

- **Aufrufe:** Zahl der `REPORT`-Zeilen (eine je Aufruf), davon mit Kaltstart (`Init Duration`),
  längste Dauer in ms und höchster Speicherverbrauch.
- **Fehler:** jede Zeile der Lambda-Laufzeit mit `[ERROR]`, `Traceback`, `Task timed out` oder
  `Status: error/timeout`, mit Uhrzeit (Berlin) und eingerückt, bei Tracebacks alle Zeilen. Die
  JSON-Zeilen des Bots zählen nie als Fehler, auch wenn eine Frage solche Wörter enthält.
- **Feste Antworten wegen Ausfall oder Grenze:** Fragen mit Ausgang `unavailable` (Modell nicht
  erreichbar), `limit` (Tagesgrenze) oder `visitor_limit` (Besuchergrenze).

Braucht `aws` mit Zugangsdaten und `jq`. Der Zugriff ist nur lesend.

## run_testsammlung.sh

Synchronisiert die Umgebung und startet `python -m testsammlung.runner` mit den übergebenen
Argumenten. Ohne Argument gegen LM Studio, mit `--target bedrock` gegen Bedrock (AWS-Aufruf, Kosten
im Cent-Bereich, nur von Hand).
