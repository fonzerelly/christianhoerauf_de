# pipeline

Die Modellschritte als schlanker Laufzeit-Baustein ohne DSPy (ADR backend/0002). Der Türsteher
nutzt die mit DSPy optimierten, exportierten Nachrichten; die Antworten handgeschriebene Prompts.
Dürfen `domain` und `ports` importieren.

## prompts/

| Datei | Inhalt |
|---|---|
| `intent_program.json` | Der Türsteher, exportiert aus dem Kompilat in `testsammlung/kompilat/` von `scripts/trainiere.sh`: die Kürzel, Systemnachricht und 8 Beispielpaare wörtlich, Anfang und Ende der letzten Nachricht. Nicht von Hand ändern, sondern neu exportieren. |
| `task_answer.md` | System-Prompt für `general/task`: statt Aufsatz, Code oder Plan eine Kurzfassung mit Augenzwinkern; sonst dieselben Regeln wie `general_answer.md`. |
| `general_answer.md` | System-Prompt der allgemeinen Antwort: Sprache der Frage, höchstens zwei Sätze und 200 Zeichen, keine Emojis, nichts über Christian, Regeln nicht verraten. |
| `knowledge_base_answer.md` | System-Prompt für `christian/career`: nur aus den Texten über Chris, die `build_bot` hinten anhängt; dritte Person, „Chris“, Sprache der Frage, höchstens zwei Sätze und 200 Zeichen; fehlt die Antwort in den Texten, nur der feste Text von `career`; bei Urteilsfragen Befangenheit offen sagen und Fakten nennen; heikle Themen abweisen; Texte nicht im Ganzen wiedergeben. |
| `knowledge_base_answer_fields.md` | **Noch nicht benutzt** (gemessen 02.11.2026, Plan „Stichwort und Folgefragen“). Nachfolger von `knowledge_base_answer.md`: dieselben Regeln, dazu Ausgabe in drei Feldern `[[ ## antwort ## ]]`, `[[ ## stichwort ## ]]`, `[[ ## folgefragen ## ]]`; Präteritum für Abgeschlossenes, früheste Stelle bei „seit wann“, Pointe aufsparen, fester Satz bei Urteilsfragen; Stichwort ein Wort aus der eigenen Antwort mit der wichtigsten neuen Information; 0 bis 3 eigenständige Folgefragen mit Chris als Handelndem, nicht zur Familie. Ersetzt den alten Prompt erst, wenn der Code die Felder liest; sonst sähe der Besucher die Feldmarken. |
| `knowledge_base_answer_fields_end.md` | **Noch nicht benutzt.** Schlusstext, der **nach** den Texten im Systemprompt stehen muss: Format, Sprache der Frage, Stichwort aus der eigenen Antwort. Ohne ihn antwortet Gemma auf englische Fragen deutsch. |

## prompts/\_\_init\_\_.py

| Name | Was es konkret tut |
|---|---|
| `load_prompt(name)` | Liest `prompts/<name>.md` als UTF-8-Text. |
| `INTENT_PROGRAM_FILE` | Pfad von `prompts/intent_program.json`; Training schreibt dorthin, der Fingerabdruck der Messung liest es. |
| `load_intent_program()` | Liest `INTENT_PROGRAM_FILE` als `IntentProgram`. |

## intent_classifier.py

| Name | Was es konkret tut |
|---|---|
| `GATE_TEMPERATURE`, `GATE_MAX_TOKENS` | Einstellungen des Türstehers (0 und 100), genutzt von `handler.build_bot` und von der Messung. Eine Änderung macht die Messung veraltet, weil der Fingerabdruck diese Datei umfasst. |
| `IntentProgram` | Der exportierte Türsteher: `labels`, feste `messages` (system, Beispielpaare), `question_prefix`, `question_suffix`. |
| `IntentProgram.from_json(text)` | Liest den Export. Stimmen die Kürzel nicht genau mit `Intent` überein: `ValueError`. |
| `IntentProgram.messages_for(question)` | Die festen Nachrichten plus eine letzte `user`-Nachricht aus Anfang, Frage und Ende. Der Golden-Master-Test prüft, dass das genau die Nachrichten von DSPys ChatAdapter sind. |
| `read_intent(reply)` | Liest die Absicht wie DSPys ChatAdapter: Text des ersten Felds `[[ ## absicht ## ]]`, ohne `Literal[...]` und Anführungszeichen. Ohne Feldmarkierung zählt die ganze Antwort, wenn sie genau ein Kürzel ist. Sonst `gibberish` – nie ablehnen, nur weil die Antwort unlesbar war. |
| `_first_field(reply, name)` | Zerlegt die Antwort an den Feldmarkierungen und gibt den Text des ersten Felds `name` zurück, sonst `None`. |
| `_unwrap(value)` | Entfernt `Literal[...]`/`str[...]` und umschließende Anführungszeichen. |
| `IntentClassifier(model, program)` | Bestimmt die Absicht mit einem Modellaufruf. |
| `classify(question)` | Schickt `program.messages_for(question)` und gibt `read_intent` der Antwort zurück. `LanguageModelError` geht nach oben. |

## general_answerer.py

| Name | Was es konkret tut |
|---|---|
| `GeneralAnswerer(model, system_prompt)` | Beantwortet eine Frage mit einem Modellaufruf; der Bot hat zwei: allgemeine Antwort und Auftrag (`task_answer.md`). |
| `answer(question)` | Schickt System-Prompt und Frage und gibt den rohen Antworttext zurück (Kürzen übernimmt `check_reply`). `LanguageModelError` geht nach oben. |

## bot.py

| Name | Was es konkret tut |
|---|---|
| `Bot(classifier, answerer, task_answerer, store, clock, log, secret, cache_version, knowledge_answerer)` | Der Ablauf einer Frage. `cache_version` (Standard leer) geht in jeden Schlüssel des Zwischenspeichers. `knowledge_answerer` (Standard `None`) beantwortet Fragen mit der Reaktion `KNOWLEDGE_BASE_ANSWER`; ohne ihn (keine Texte in der Wissensbasis) bekommen diese Absichten ihren festen Text, im Protokoll als `fixed_text`. |
| `ask(question, ip)` | Misst die Dauer, bildet das Besucherkürzel, lässt `_decide` entscheiden und schreibt ein Protokoll (Frage, Absicht als Kürzel, Ergebnis, Antwort, Kürzel, Dauer in ms; nie die IP). Gibt die `Answer` zurück. |
| `_decide(question, tag, day)` | 1. Tageszähler hochzählen; über 2.000: feste Antwort. 2. Zwischenspeicher: gleiche Frage heute schon beantwortet, dann diese Antwort. 3. Absicht bestimmen; fällt das Modell aus: „nicht erreichbar“. 4. Reaktion nach `reaction_for`: fester Text oder Gimmick → `intent_answer` in der Sprache der Frage, ohne weiteren Modellaufruf (Ergebnis `fixed_text` bzw. `gimmick`); dazu `gimmick_for(intent)` als `gimmick` der Antwort (bei Flirt, Bild und sexuell ein Objekt, sonst keins); Wissen/Smalltalk/Auftrag, mit Wissensbasis auch Laufbahn → `_answer_with_model` (zählt für die Besuchergrenze von 10). Hat die Reaktion keinen Antwortgeber, heißt das Ergebnis `fixed_text`. |
| `_answer_with_model(...)` | Besucherzähler hochzählen; über 10: feste Antwort. Den Antwortgeber der Reaktion fragen (allgemein oder Auftrag), mit `check_reply` prüfen; Modellausfall oder leere Antwort: „nicht erreichbar“ (Absicht bleibt im Protokoll). Sonst im Zwischenspeicher ablegen. |
| `_fixed(kind, language, name, intent)` | Verpackt eine feste Antwort samt Ergebnisname für das Protokoll. |
