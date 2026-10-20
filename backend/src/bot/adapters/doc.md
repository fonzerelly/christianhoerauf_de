# adapters

Anschlüsse der Schnittstellen aus `ports/` an AWS, LM Studio und Dateien. Dürfen `domain` und
`ports` importieren, nicht `pipeline` und nicht `handler`.

## openai_compatible.py

| Name | Was es konkret tut |
|---|---|
| `OpenAiCompatibleModel(base_url, model, token_provider, reasoning_effort, timeout_seconds)` | Sprachmodell über OpenAI-kompatible Chat Completions (Bedrock `bedrock-mantle` und LM Studio). Pro Modellschritt eine eigene Instanz, so lässt sich die Denkphase je Schritt einstellen (Standard `"none"`). Nur Standardbibliothek. |
| `complete(messages)` | Schickt `POST <base_url>/chat/completions` mit Modell, Nachrichten und `reasoning_effort`; mit `token_provider` zusätzlich `Authorization: Bearer <Schlüssel>`. Liefert den getrimmten Text der ersten Antwort. Jeder Fehler wird zu `LanguageModelError`. |
| `_request_body(messages)` | Baut den JSON-Körper. |
| `_headers()` | Baut die Header; ruft bei jedem Aufruf den `token_provider` neu auf. |
| `_send(request)` | Sendet mit Zeitlimit. HTTP-Fehler, Zeitlimit (auch beim Verbinden) und Nichterreichbarkeit werden zu `LanguageModelError` mit kurzer Meldung ohne Header. Das Zeitlimit gilt je Socket-Operation; die Gesamtgrenze setzt das Lambda-Timeout. |
| `_read_text(raw)` | Liest `choices[0].message.content`; fehlt es oder ist es kein Text, `LanguageModelError`. |

## bedrock_token.py

| Name | Was es konkret tut |
|---|---|
| `bedrock_token_provider(region)` | Liefert eine Funktion, die bei jedem Aufruf aus den Rechten der Lambda-Rolle einen Bedrock-API-Schlüssel (15 Minuten gültig, `bedrock-api-key-...`) erzeugt. Das Signieren geschieht lokal, ohne Aufruf bei AWS. |
