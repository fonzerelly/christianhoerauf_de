# bot

Wurzel des Pakets. Unterordner: `domain/` (Fachlogik), `ports/` (Schnittstellen),
`adapters/` (Anschlüsse an Außenwelt), `pipeline/` (Ablauf der Modellschritte). Die
Abhängigkeitsregeln stehen in `pyproject.toml` unter `[tool.importlinter]`.

## handler.py

Einstieg des Lambdas; als einzige Datei darf sie alle Schichten kennen. Vertrag: `POST` mit
JSON `{"question": "..."}` (`schema/request.schema.json`), Antwort `{"text", "gimmick"?}`
(`schema/answer.schema.json`).

| Name | Was es konkret tut |
|---|---|
| `handler(event, context)` | Lambda-Einstieg. Baut beim ersten Aufruf den Bot mit `build_bot(os.environ)`, behält ihn für warme Aufrufe und ruft `handle`. |
| `handle(event, bot)` | Liest die Frage (`_read_question`). Ungültig: `400` mit fester Antwort. Sonst `bot.ask(frage, sourceIp)` und `200` mit der Antwort als JSON. Wirft der Bot unerwartet, wird der Fehler protokolliert und es kommt trotzdem `200` mit der festen „nicht erreichbar“-Antwort. Grenzen und Modellausfall sind ebenfalls `200`. |
| `_read_question(event)` | Nur `POST`; Körper ggf. Base64-dekodieren, als JSON lesen; `question` muss Text sein, nicht leer (nach Entfernen von Leerraum) und höchstens 500 Zeichen lang. Sonst `None`. |
| `_response(status, answer)` | Baut die Lambda-Antwort mit Statuscode, `Content-Type: application/json; charset=utf-8` und JSON-Körper (Umlaute unverändert). |
| `build_bot(environ)` | Steckt alles zusammen: zwei `OpenAiCompatibleModel` (Absicht, Antwort), `DynamoDbStore`, `SystemClock`, `JsonLog`. Pflicht: `TABLE_NAME`, `VISITOR_SECRET` (sonst `KeyError`). Optional: `LLM_BASE_URL`, `LLM_MODEL` (Standard Bedrock/Gemma), `LLM_TIMEOUT_SECONDS` (10), `LLM_AUTH=none`, `AWS_REGION`. |
