# adapters

Anschlüsse der Schnittstellen aus `ports/` an AWS, LM Studio und Dateien. Dürfen `domain` und
`ports` importieren, nicht `pipeline` und nicht `handler`.

## openai_compatible.py

| Name | Was es konkret tut |
|---|---|
| `OpenAiCompatibleModel(base_url, model, token_provider, reasoning_effort, timeout_seconds, temperature, max_tokens)` | Sprachmodell über OpenAI-kompatible Chat Completions (Bedrock `bedrock-mantle` und LM Studio). Pro Modellschritt eine eigene Instanz, so lassen sich Denkphase (Standard `"none"`), `temperature` und `max_tokens` je Schritt einstellen. Nur Standardbibliothek. |
| `complete(messages)` | Schickt `POST <base_url>/chat/completions` mit Modell, Nachrichten und `reasoning_effort`; mit `token_provider` zusätzlich `Authorization: Bearer <Schlüssel>`. Liefert den getrimmten Text der ersten Antwort. Jeder Fehler wird zu `LanguageModelError`. |
| `_request_body(messages)` | Baut den JSON-Körper. `temperature` und `max_tokens` kommen nur hinein, wenn sie gesetzt sind; sonst gilt die Voreinstellung des Modellservers. |
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
| `SystemClock.now()` | Datum und Uhrzeit jetzt in deutscher Zeit (`GERMAN_TIME`, Europe/Berlin, mit Sommer- und Winterzeit aus dem Paket `tzdata`). Nur für den Prompt der allgemeinen Antwort; Zähler und Zwischenspeicher bleiben bei `today()` in UTC. |
| `SystemClock.seconds()` | `time.monotonic()`. |

## json_log.py

| Name | Was es konkret tut |
|---|---|
| `JsonLog(emit)` | Protokoll nach `emit` (Standard `print`, Lambda leitet das nach CloudWatch). |
| `write(record)` | Gibt den Eintrag als eine JSON-Zeile mit unveränderten Umlauten aus. |

## knowledge_files.py

| Name | Was es konkret tut |
|---|---|
| `KNOWLEDGE_FOLDERS` | Die Ordner, die der Bot liest: `stationen`, `projekte`, `anekdoten`. Alles andere (`roh/` mit Diktaten und Noten, `entwuerfe/`, lose Dateien) bleibt draußen. |
| `knowledge_texts(folder)` | Liest alle `*.md` direkt in den Ordnern `KNOWLEDGE_FOLDERS` unter `folder`, sortiert nach Pfad, und gibt sie als einen Text zurück: je Datei eine Überschrift `# <pfad relativ zu folder>`, eine Leerzeile und der ganze Text samt Kopfteil; zwischen zwei Texten eine Leerzeile. Fehlt der Ordner oder ist er leer: leerer Text. |

## cv_files.py

Liest Stationen und Varianten für den Lebenslauf. Braucht PyYAML, das bisher nur in der
Entwicklungsgruppe steht; der Bot importiert das Modul nicht. Für den Lebenslauf-Endpunkt muss
PyYAML zu den Laufzeitabhängigkeiten.

| Name | Was es konkret tut |
|---|---|
| `read_cv_stations(knowledge_base)` | Liest jede Datei in `knowledge_base/stationen/` (sortiert) und macht daraus mit `parse_station` eine `CvStation`; Name = Dateiname ohne `.md`. |
| `read_cv_projects(knowledge_base)` | Liest jede Datei in `knowledge_base/projekte/` (sortiert) mit `parse_project`. Jedes Projekt muss gültige Felder haben, auch wenn es gerade in keinem Lebenslauf steht. |
| `read_cv_data(knowledge_base, variants_path)` | Liest Stationen, Projekte, Projektliste und Varianten auf einmal und gibt sie als `CvData` zurück; für Lebenslauf-Endpunkt und PDF. |
| `read_cv_project_list(path, known_projects)` | Die Projekte des ganzen Lebenslaufs aus `projekte:` der Variantendatei (`parse_project_list`); fehlt die Datei → keine Projekte. |
| `read_variants(path, station_names, project_names)` | Liest die weglassenden Schalter (`parse_switches`, erlaubt: Abschnitte, Stationen, Projekte) und die dazunehmenden (`parse_additions`, erlaubt: nur Projekte) aus der YAML-Datei und gibt alle Varianten zurück (`all_variants`); fehlt sie oder ist sie leer → keine Varianten. |
| `_header(path)` | Der Kopfteil zwischen den ersten beiden `---`-Zeilen als YAML; ist er kein gültiges YAML → `InvalidStationError` mit Ordner und Datei. |
