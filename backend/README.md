# christianhoerauf.de – Backend

Der Dienst hinter dem Bot auf christianhoerauf.de: eine AWS-Lambda-Funktion in Python 3.14
(arm64), die Fragen beantwortet. Die Antwort ist ein JSON-Objekt mit `text` und optional
`gimmick`.

Python, Ports & Adapters, DSPy nur beim Entwickeln. Das Lambda-Paket enthält kein DSPy.

## Voraussetzungen

- [uv](https://docs.astral.sh/uv/) (holt Python 3.14 selbst)
- Docker (nur für die Kaltstart-Messung)

## Installieren

```bash
uv sync --locked                # Entwicklungswerkzeuge, ohne DSPy
uv sync --locked --group dspy   # zusätzlich DSPy (zum Optimieren)
```

## Befehle

| Befehl                                  | Was er tut                                                                                                     |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `scripts/check.sh`                      | Alles prüfen: ruff (Format, Lint), mypy strict, pytest mit 100 % Abdeckung, Architekturtest. Vor jedem Commit. |
| `uv run pytest`                         | Unit-Tests mit Abdeckung; bricht unter 100 % Zeilen und Zweigen ab.                                            |
| `uv run mypy`                           | Typprüfung im strikten Modus.                                                                                  |
| `uv run ruff check .`                   | Lint.                                                                                                          |
| `uv run ruff format .`                  | Formatieren (`format --check` in `check.sh`).                                                                  |
| `PYTHONPATH=src uv run lint-imports`    | Architekturtest: Abhängigkeitsrichtung der Schichten (import-linter).                                          |
| `scripts/build_package.sh`              | Baut das Lambda-Paket `build/lambda.zip` (Linux arm64, nur Laufzeitabhängigkeiten) und gibt die Größe aus.     |
| `scripts/measure_cold_start.sh`         | Misst den Kaltstart des Pakets lokal im offiziellen Lambda-Image (siehe Skript).                               |

## Aufbau

```
pyproject.toml, uv.lock   Abhängigkeiten (feste Versionen) und Werkzeug-Einstellungen
src/bot/
  domain/       Fachlogik ohne Ein-/Ausgabe
  ports/        Schnittstellen zur Außenwelt
  adapters/     Anschlüsse an AWS, LM Studio, Dateien
  pipeline/     Modellschritte (zur Laufzeit ohne DSPy)
  handler.py    Einstieg des Lambdas, steckt alles zusammen
schema/         JSON-Schema des Vertrags (answer.schema.json)
tests/          Unit-Tests
scripts/        Prüfen, Paket bauen, Kaltstart messen
```

Regeln der Abhängigkeiten (`pyproject.toml`, `[tool.importlinter]`): `domain` importiert nur
`domain`; `ports` nur `domain`; `pipeline` und `adapters` dürfen `domain` und `ports`, kennen
sich aber nicht; nur `handler.py` kennt alles. `domain` und `ports` importieren weder boto3
noch DSPy noch HTTP-Clients.

Jeder Ordner unter `src/bot/` hat eine `doc.md`, die seine Funktionen und Methoden beschreibt.

## Abhängigkeiten

Alle Versionen sind fest eingetragen, `uv.lock` hält die Auflösung. Neue Versionen werden nur
übernommen, wenn sie mindestens zwei Wochen alt sind (`exclude-newer = "2 weeks"`).
Laufzeitabhängigkeiten (`dependencies`) landen im Lambda-Paket, die Gruppen `dev` und `dspy` nie.
