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
| `handler(event, context)` | Lambda-Einstieg. `GET /lebenslauf` geht an `_serve_cv`, ohne den Bot zu bauen. Alles andere: baut beim ersten Aufruf den Bot mit `build_bot(os.environ)`, behält ihn für warme Aufrufe und ruft `handle`. |
| `_is_cv_request(event)` | `True` bei Methode `GET` und `rawPath` gleich `CV_PATH` (`/lebenslauf`). |
| `handle_cv(event, cv_data)` | Liest `variante` aus den Query-Parametern; nur Ziffern zählen. Sucht die Variante mit dieser Nummer (`variant_by_number`); ohne, mit unbekannter oder kaputter Nummer der ganze Lebenslauf. Antwortet `200` mit `public_cv(...)` als JSON (`schema/lebenslauf.schema.json`) und `Cache-Control: public, max-age=300`. |
| `load_cv_data(environ)` | `read_cv_data` mit der Wissensbasis aus `WISSENSBASIS_DIR` und `varianten.yaml` aus dem Ordner `LEBENSLAUF_DIR`; ohne die Variablen `wissensbasis/` und `lebenslauf/` neben `bot/` im Paket. |
| `_serve_cv(event)` | Liest die Daten beim ersten Aufruf (`load_cv_data`) und behält sie in `_cv_data`. Wirft das Lesen, wird es protokolliert und es kommt `503` mit `{"fehler": "Lebenslauf gerade nicht verfügbar"}`; der nächste Aufruf liest neu. |
| `_json_response(status, body, headers)` | Lambda-Antwort mit Statuscode, `Content-Type: application/json; charset=utf-8` plus `headers` und JSON-Körper (Umlaute unverändert). |
| `handle(event, bot)` | Liest die Frage (`_read_question`). Ungültig: `400` mit fester Antwort. Sonst `bot.ask(frage, sourceIp)` und `200` mit der Antwort als JSON. Wirft der Bot unerwartet, wird der Fehler protokolliert und es kommt trotzdem `200` mit der festen „nicht erreichbar“-Antwort. Grenzen und Modellausfall sind ebenfalls `200`. |
| `_read_question(event)` | Nur `POST`; Körper ggf. Base64-dekodieren, als JSON lesen; `question` muss Text sein, nicht leer (nach Entfernen von Leerraum) und höchstens 500 Zeichen lang. Sonst `None`. |
| `_response(status, answer)` | Baut die Lambda-Antwort mit Statuscode, `Content-Type: application/json; charset=utf-8` und JSON-Körper (Umlaute unverändert). |
| `language_model(environ, temperature, max_tokens)` | Baut ein `OpenAiCompatibleModel` aus der Umgebung: `LLM_BASE_URL` (Standard Bedrock Frankfurt), `LLM_MODEL` (Standard `google.gemma-4-26b-a4b`), `LLM_TIMEOUT_SECONDS` (10), Bearer-Token aus den AWS-Zugangsdaten für `AWS_REGION` (Standard `eu-central-1`), außer bei `LLM_AUTH=none`. `temperature` und `max_tokens` gehen unverändert ans Modell. Von `build_bot` je Schritt aufgerufen und von `testsammlung/targets.py` für Messungen, damit beide denselben Weg zum Modell nehmen. |
| `build_bot(environ)` | Steckt alles zusammen: drei `OpenAiCompatibleModel` (je eins mit `language_model`) – Türsteher mit `temperature` 0 und höchstens 100 Ausgabe-Tokens (wie bei der Messung) und dem exportierten Programm `intent_program.json`, allgemeine Antwort mit `general_answer.md` und Datum und Uhrzeit von jetzt (`SystemClock.now()`, deutsche Zeit), Auftrag mit `task_answer.md`, Laufbahn mit `knowledge_base_answer_fields.md`, den `knowledge_texts` der Wissensbasis und dem Schlusstext `knowledge_base_answer_fields_end.md` (`knowledge_base_system_prompt`; nur wenn es Texte gibt) –, dazu `DynamoDbStore`, `SystemClock`, `JsonLog`. Pflicht: `TABLE_NAME`, `VISITOR_SECRET` (sonst `KeyError`). Optional: `LLM_BASE_URL`, `LLM_MODEL` (Standard Bedrock/Gemma), `LLM_TIMEOUT_SECONDS` (10), `LLM_AUTH=none`, `AWS_REGION`, `BUILD_ID` (über `cache_version`), `WISSENSBASIS_DIR` (Standard: `wissensbasis/` neben `bot/` im Paket). |
| `cache_version(environ)` | Kennung des Ausrollens für den Zwischenspeicher: `BUILD_ID` (setzt OpenTofu auf die Prüfsumme des Pakets), ohne die Variable `lokal`. |
