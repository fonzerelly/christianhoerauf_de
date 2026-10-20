# bot

Wurzel des Pakets. Unterordner: `domain/` (Fachlogik), `ports/` (Schnittstellen),
`adapters/` (Anschlüsse an Außenwelt), `pipeline/` (Ablauf der Modellschritte). Die
Abhängigkeitsregeln stehen in `pyproject.toml` unter `[tool.importlinter]`.

## handler.py

Einstieg des Lambdas; als einzige Datei darf sie alle Schichten kennen.

| Name | Was es konkret tut |
|---|---|
| `handler(event, context)` | **Platzhalter bis Schritt 5.** Ignoriert die Anfrage und antwortet mit Statuscode 200, dem Header `Content-Type: application/json` und der Antwort `{"text": "Ich bin noch im Aufbau."}` als JSON-Text im `body`. Dient dazu, Paketgröße und Kaltstart an einem echten Einstiegspunkt zu messen. |
