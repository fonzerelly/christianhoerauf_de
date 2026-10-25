# tests

Unit-Tests (pytest) mit harter Abdeckungsschwelle von 100 % Zeilen und Zweigen. Der Ordnerbau
spiegelt `src/bot/`. Property-based Tests (Hypothesis) liegen neben den Beispieltests und enden
auf `_properties.py`.

| Datei | Was sie prüft |
|---|---|
| `domain/test_answer.py` | `Answer.to_dict()` ohne und mit Gimmick. |
| `domain/test_answer_properties.py` | Beliebiger Text übersteht die Umwandlung nach JSON und zurück unverändert. |
| `test_handler.py` | `handle`: 200 mit Antwort (jede Antwort gegen das Antwort-Schema), Base64-Körper, 400 bei allen ungültigen Anfragen (und Übereinstimmung mit `request.schema.json`), 200 mit fester Antwort bei Modellausfall und unerwartetem Fehler; `build_bot`: Pflichtvariablen und Zusammenbau; `handler` baut den Bot nur einmal. `cache_version` liest `BUILD_ID`, sonst `lokal`. |
| `test_build_package.py` | `build_package()` (Testhelfer): startet `scripts/build_package.sh` und liefert die Dateinamen im ZIP. `test_package_contains_handler_but_no_docs_or_dspy`: enthält `bot/handler.py`, keine `doc.md`, kein DSPy. `test_package_is_well_below_the_lambda_size_limit`: ZIP unter 25 MiB (mit boto3 rund 16 MiB). |
| `domain/test_answer_schema.py` | Jede `Answer` (Beispiele und beliebiger Text) genügt `schema/answer.schema.json`; kaputte Antworten (ohne Text, leerer Text, Gimmick ohne `type`, unbekannter Schlüssel) lehnt das Schema ab. |
| `domain/test_intent.py` | Es gibt genau die 17 Absichten aus `ABSICHTEN.md` in dieser Reihenfolge; `group` ist der Teil vor dem `/`. |
| `domain/test_reaction.py` | Reaktionstabelle: nur Wissen und Smalltalk ans Modell frei, Auftrag mit eigenem Prompt, Flirt/Bild/sexuell als Gimmick, alles andere fester Text; heikel, Umgehung und Christian erreichen nie das Modell. |
| `domain/test_language.py` | `guess_language` für deutsche, englische, leere und Zahlen-Fragen. |
| `domain/test_fixed_answers.py` | Feste Texte je Absicht genau wie in `ABSICHTEN.md` (deutsch und englisch), für jede Absicht ohne Modellantwort einer, für Wissen/Smalltalk/Auftrag `ValueError`; übrige feste Antworten (Ausfall, Grenzen, ungültig): Wortlaut, Englisch ≠ Deutsch, alle kurz und ohne Gimmick. |
| `domain/test_cost_protection.py` | Grenzen, Schlüssel, Aufbereitung der Frage; Hypothesis: gleiche IP/Tag gleiches Kürzel, anderer Tag/andere IP/anderes Geheimnis anderes Kürzel, Kürzel kurz und ohne IP. Der Cache-Schlüssel unterscheidet sich je Ausrollen (`version`). |
| `domain/test_reply_check.py` | Emojis weg, Leerraum, Umlaute bleiben, Kürzen an Satzgrenze, Wort oder hart; Hypothesis: nie länger als 200 Zeichen. |
| `domain/test_gimmick.py` | Leere Anmeldung; angemeldetes Gimmick erscheint samt Beschreibung. |
| `fakes.py`, `test_fakes.py` | Testhelfer `FakeLanguageModel` (antwortet der Reihe nach, wirft Exceptions aus der Liste, merkt sich Aufrufe) und `failing_model()`; `test_fakes.py` prüft beides. |
| `conftest.py` | `FakeServer`, Fixture `server` (kleiner HTTP-Server auf localhost, zeichnet Anfragen auf) und `reply_body(text)` (Antwort im Chat-Completions-Format); genutzt von den Adapter- und Handler-Tests. |
| `adapters/test_openai_compatible.py` | `OpenAiCompatibleModel` gegen den HTTP-Server aus `conftest.py` (kein Internet): Pfad, Modell, `reasoning_effort`, `temperature` und `max_tokens` (nur wenn gesetzt), Bearer-Header, Fehlerfälle (HTTP 500 ohne Schlüssel in der Meldung, nicht erreichbar, Zeitlimit, unbrauchbare Antworten). |
| `adapters/test_bedrock_token.py` | Mit erfundenen Zugangsdaten beginnt der Schlüssel mit `bedrock-api-key-` (rein lokal). |
| `pipeline/test_prompts.py` | Antwort-Prompts (allgemein, Auftrag) nennen Längen- und Sprachregel, der Auftrags-Prompt Kurzfassung und Augenzwinkern; der exportierte Türsteher kennt alle Absichten. |
| `pipeline/test_intent_classifier.py` | Golden Master: `messages_for` liefert für die Fragen in `pipeline/intent_golden.json` genau die Nachrichten von DSPys ChatAdapter. Export lesen (falsche Kürzel → `ValueError`), Antwort lesen wie DSPy (Feld, Anführungszeichen, `Literal[...]`, erstes Feld, nacktes Kürzel), unlesbar → `gibberish`, gesendete Nachrichten, Modellausfall. |
| `pipeline/intent_golden.json` | Von `testsammlung/training.py` mit DSPy erzeugte Nachrichten für drei Fragen. Nicht von Hand ändern. |
| `pipeline/test_general_answerer.py` | Antworttext, gesendete Nachrichten, Modellausfall. |
| `integration/test_lm_studio.py` | Markiert `integration`, läuft nur mit `pytest -m integration --no-cov` und erreichbarem LM Studio: Absicht und Antwort (Canberra) gegen das echte Modell. |
| `testsammlung/test_cases.py` | `load_cases` liest alle Felder und mehrere erlaubte Absichten (Leerzeichen oder Liste); die echte `cases.yaml` hat mindestens 25 Fälle, die Gruppen allgemein, Christian, Umgehung und Rechenfragen. |
| `testsammlung/test_runner.py` | `run_case` (Treffer, Fehlgriff, jede erlaubte Absicht ist ein Treffer, Wortprüfung, Modellausfall) und `summarize` (Quote, Fehlgriffe mit allen erlaubten Absichten, Rechenfragen). |
| `testsammlung/test_main.py` | `main` druckt die Zusammenfassung und reicht das Ziel an die Modellfabrik weiter. |
| `testsammlung/test_models.py` | `build_model` baut für `lmstudio` und `bedrock` ein Modell, sonst `ValueError`. |
| `testsammlung/test_questions.py` | `load_questions` (Text, mehrere erlaubte Absichten, Grenzfall; unbekanntes Kürzel → `ValueError`), Hauptabsicht, `reference` (erlaubt, gleiche Gruppe, sonst Hauptabsicht), `load_catalog` (Regeln, Beschreibungen; fehlende oder vertauschte Absicht → `ValueError`), `start_instruction`, `split_training` (erste 6 je Absicht), `thin_intents`, `critical_miss` (freie Antwort, wo eine feste Reaktion hingehört), `training_score` (1 / 0,5 / −2 für kritisch / 0, unbekanntes Kürzel 0, streng nur 1 oder 0). |
| `testsammlung/test_export.py` | `program_export` teilt die letzte Nachricht am Platzhalter und behält die anderen wörtlich; falsche Rolle, fehlender oder doppelter Platzhalter → `ValueError`. |
| `testsammlung/test_fingerprint.py` | Beide Fingerabdrücke sind stabil, ändern sich mit jedem Eingang, YAML-Kommentare ändern nichts; `problems` meldet fehlendes oder veraltetes Training, fehlende, veraltete oder nicht bestandene Messung mit dem passenden Skript; `main` gibt 0 oder 1 zurück und druckt den Stand. |
| `testsammlung/test_measurement.py` | `measure` fragt den Türsteher des Bots und behält die Rohantwort, Modellausfall ohne Absicht, Fortschritt alle 20 Fragen; Stufe 1, Stufe 2 nach Q5, kritisch, erfundenes Kürzel; Quoten und Schwellen von `Report`; `christian_mixups` und ihr eigener Abschnitt in `summary`; `summary`, `measurement_record`; `main` schreibt `messung.json` mit Fingerabdruck und gibt 0 oder 1 zurück. |
| `adapters/test_memory_store.py` | Zählen je Schlüssel, Lesen und Schreiben. |
| `adapters/test_dynamodb_store.py` | Mit Attrappen-Client: `UpdateItem` mit `ADD`, Ablauf und Rückgabe; `PutItem`; `GetItem` mit und ohne Treffer, reiner Zähler. |
| `adapters/test_system_clock.py` | Datum in UTC, Sekunden gehen nie rückwärts. |
| `adapters/test_json_log.py` | Eintrag wird eine JSON-Zeile, Umlaute bleiben. |
| `pipeline/test_bot.py` | Der ganze Ablauf mit Attrappen und `MemoryStore`: Wissen/Smalltalk mit allgemeinem Prompt, Auftrag mit Auftrags-Prompt, jede andere Absicht mit ihrem festen Text ohne Antwortaufruf, Sprache der Frage, unlesbarer Türsteher → „nicht verstanden“, Prüfung, Zwischenspeicher, Tages- und Besuchergrenze, Zählregeln, Modellausfall an jeder Stelle, leere Antwort, Protokoll (Kürzel, Ergebnis `fixed_text`/`gimmick`/`answered`, ohne IP). Einträge eines früheren Ausrollens werden nicht genutzt. |
| `integration/test_handler_lm_studio.py` | Markiert `integration`: Handler mit `MemoryStore` gegen LM Studio (Canberra, fester Text für Beruf, „Netter Versuch.“ bei Umgehung). |
| `test_build_package.py` (ergänzt) | Paket enthält Prompts und boto3, nicht die Testsammlung. |
| `test_handler.py` (ergänzt) | `build_bot` fragt den Türsteher mit dem exportierten Programm, `temperature` 0 und `max_tokens` 100, die Antwort mit `general_answer.md` ohne `temperature` (gegen den HTTP-Server aus `conftest.py`, DynamoDB durch `MemoryStore` ersetzt). |
| `fake_aws.py` | `run_with_fake_aws(script, tmp_path, messages, *args)`: startet ein Skript aus `scripts/` mit einem falschen `aws` vorn im PATH, das seine Argumente aufschreibt und Protokollzeilen im Format von `aws logs filter-log-events` liefert. `start_time_seconds(tmp_path)`: der übergebene `--start-time` in Sekunden. |
| `test_protokoll_script.py` | `protokoll.sh`: Ausgabe je Frage (Uhrzeit Berlin, Absicht, Ergebnis, Dauer, Kürzel, Frage, Antwort), andere Zeilen übersprungen, Besucher gezählt, `–` ohne Absicht, Tage an `aws` weitergereicht. |
| `test_fehler_script.py` | `fehler.sh`: leerer Zeitraum, Aufrufe mit Kaltstart, längster Dauer und Speicher, Fehler mit Uhrzeit und eingerücktem Traceback, feste Antworten wegen Ausfall oder Grenze, Tage an `aws` weitergereicht. |
