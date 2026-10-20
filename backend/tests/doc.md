# tests

Unit-Tests (pytest) mit harter Abdeckungsschwelle von 100 % Zeilen und Zweigen. Der Ordnerbau
spiegelt `src/bot/`. Property-based Tests (Hypothesis) liegen neben den Beispieltests und enden
auf `_properties.py`.

| Datei | Was sie prüft |
|---|---|
| `domain/test_answer.py` | `Answer.to_dict()` ohne und mit Gimmick. |
| `domain/test_answer_properties.py` | Beliebiger Text übersteht die Umwandlung nach JSON und zurück unverändert. |
| `test_handler.py` | `handle`: 200 mit Antwort (jede Antwort gegen das Antwort-Schema), Base64-Körper, 400 bei allen ungültigen Anfragen (und Übereinstimmung mit `request.schema.json`), 200 mit fester Antwort bei Modellausfall und unerwartetem Fehler; `build_bot`: Pflichtvariablen und Zusammenbau; `handler` baut den Bot nur einmal. |
| `test_build_package.py` | `build_package()` (Testhelfer): startet `scripts/build_package.sh` und liefert die Dateinamen im ZIP. `test_package_contains_handler_but_no_docs_or_dspy`: enthält `bot/handler.py`, keine `doc.md`, kein DSPy. `test_package_is_well_below_the_lambda_size_limit`: ZIP unter 25 MiB (mit boto3 rund 16 MiB). |
| `domain/test_answer_schema.py` | Jede `Answer` (Beispiele und beliebiger Text) genügt `schema/answer.schema.json`; kaputte Antworten (ohne Text, leerer Text, Gimmick ohne `type`, unbekannter Schlüssel) lehnt das Schema ab. |
| `domain/test_intent.py` | Es gibt genau die vier Absichten. |
| `domain/test_language.py` | `guess_language` für deutsche, englische, leere und Zahlen-Fragen. |
| `domain/test_fixed_answers.py` | Feste Antworten: Wortlaut für Christian und Ausfall, Englisch unterscheidet sich vom Deutschen, alle kurz und ohne Gimmick. |
| `domain/test_cost_protection.py` | Grenzen, Schlüssel, Aufbereitung der Frage; Hypothesis: gleiche IP/Tag gleiches Kürzel, anderer Tag/andere IP/anderes Geheimnis anderes Kürzel, Kürzel kurz und ohne IP. |
| `domain/test_reply_check.py` | Emojis weg, Leerraum, Umlaute bleiben, Kürzen an Satzgrenze, Wort oder hart; Hypothesis: nie länger als 200 Zeichen. |
| `domain/test_gimmick.py` | Leere Anmeldung; angemeldetes Gimmick erscheint samt Beschreibung. |
| `fakes.py`, `test_fakes.py` | Testhelfer `FakeLanguageModel` (antwortet der Reihe nach, wirft Exceptions aus der Liste, merkt sich Aufrufe) und `failing_model()`; `test_fakes.py` prüft beides. |
| `adapters/test_openai_compatible.py` | `OpenAiCompatibleModel` gegen einen kleinen HTTP-Server auf localhost (kein Internet): Pfad, Modell, `reasoning_effort`, Bearer-Header, Fehlerfälle (HTTP 500 ohne Schlüssel in der Meldung, nicht erreichbar, Zeitlimit, unbrauchbare Antworten). |
| `adapters/test_bedrock_token.py` | Mit erfundenen Zugangsdaten beginnt der Schlüssel mit `bedrock-api-key-` (rein lokal). |
| `pipeline/test_prompts.py` | Prompt-Dateien vorhanden, nennen alle Wörter und die Längen-/Sprachregel. |
| `pipeline/test_intent_classifier.py` | Antwort zu Absicht (auch mit Satzzeichen, Markdown, Text drumherum), unlesbar gleich unzulässig, gesendete Nachrichten, Modellausfall. |
| `pipeline/test_general_answerer.py` | Antworttext, gesendete Nachrichten, Modellausfall. |
| `integration/test_lm_studio.py` | Markiert `integration`, läuft nur mit `pytest -m integration --no-cov` und erreichbarem LM Studio: Absicht und Antwort (Canberra) gegen das echte Modell. |
| `testsammlung/test_cases.py` | `load_cases` liest alle Felder; die echte `cases.yaml` hat mindestens 25 Fälle, alle Absichten und Rechenfragen. |
| `testsammlung/test_runner.py` | `run_case` (Treffer, Fehlgriff, Wortprüfung, Modellausfall) und `summarize` (Quote, Fehlgriffe, Rechenfragen). |
| `testsammlung/test_main.py` | `main` druckt die Zusammenfassung und reicht das Ziel an die Modellfabrik weiter. |
| `testsammlung/test_models.py` | `build_model` baut für `lmstudio` und `bedrock` ein Modell, sonst `ValueError`. |
| `adapters/test_memory_store.py` | Zählen je Schlüssel, Lesen und Schreiben. |
| `adapters/test_dynamodb_store.py` | Mit Attrappen-Client: `UpdateItem` mit `ADD`, Ablauf und Rückgabe; `PutItem`; `GetItem` mit und ohne Treffer, reiner Zähler. |
| `adapters/test_system_clock.py` | Datum in UTC, Sekunden gehen nie rückwärts. |
| `adapters/test_json_log.py` | Eintrag wird eine JSON-Zeile, Umlaute bleiben. |
| `pipeline/test_bot.py` | Der ganze Ablauf mit Attrappen und `MemoryStore`: allgemeine Antwort, Prüfung, Gimmick, Zwischenspeicher, Christian (de/en), unzulässig, Tages- und Besuchergrenze, Zählregeln, Modellausfall, leere Antwort, Protokoll (ohne IP). |
| `integration/test_handler_lm_studio.py` | Markiert `integration`: Handler mit `MemoryStore` gegen LM Studio (Canberra, feste Christian-Antwort, Ablehnung). |
| `test_build_package.py` (ergänzt) | Paket enthält Prompts und boto3, nicht die Testsammlung. |
