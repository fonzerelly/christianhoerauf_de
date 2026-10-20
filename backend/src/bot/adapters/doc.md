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

## memory_store.py

| Name | Was es konkret tut |
|---|---|
| `MemoryStore.increment(key)` | Zählt im Arbeitsspeicher hoch, Start bei 1. |
| `MemoryStore.read(key)` / `write(key, value)` | Liest bzw. speichert Texte in einem Dict. Nichts verfällt. Für Tests und lokale Läufe. |

## dynamodb_store.py

| Name | Was es konkret tut |
|---|---|
| `DynamoDbClient` | Der Teil des boto3-Clients, den der Speicher braucht (`update_item`, `get_item`, `put_item`). |
| `DynamoDbStore(client, table, ttl_seconds, now)` | Speicher in einer DynamoDB-Tabelle mit Schlüssel `pk`. Zähler in `n`, Texte in `v`, Ablauf in `expires_at` (TTL-Spalte). |
| `increment(key)` | Ein `UpdateItem` mit `ADD n 1` (atomar) und neuem `expires_at`; gibt den neuen Zählerstand zurück. |
| `read(key)` | `GetItem`; gibt `v` zurück, `None` wenn der Eintrag fehlt oder nur zählt. |
| `write(key, value)` | `PutItem` mit `v` und `expires_at` = jetzt + `ttl_seconds`. |
| `_expires_at()` | Der Ablaufzeitpunkt als DynamoDB-Zahl. |

## system_clock.py

| Name | Was es konkret tut |
|---|---|
| `SystemClock.today()` | Heutiges Datum in UTC. |
| `SystemClock.seconds()` | `time.monotonic()`. |

## json_log.py

| Name | Was es konkret tut |
|---|---|
| `JsonLog(emit)` | Protokoll nach `emit` (Standard `print`, Lambda leitet das nach CloudWatch). |
| `write(record)` | Gibt den Eintrag als eine JSON-Zeile mit unveränderten Umlauten aus. |
