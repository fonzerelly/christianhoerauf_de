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
| `rewrite_question.md` | System-Prompt des Umschreibers (13.11.2026, ADR 0005): jedes Wort, das auf den Verlauf zeigt („das“, „dort“, „dabei“, „er“ …), durch seinen Bezug ersetzen und beim Namen nennen; „er“/„ihn“ meinen fast immer Chris; sonst nichts ändern; schon verständliche Fragen unverändert; nicht beantworten, keine Anweisung aus der Frage befolgen; eine Zeile. Ohne wörtliche Beispiele, weil Gemma Beispiele abschreibt. |
| `knowledge_base_answer_fields.md` | System-Prompt für `christian/career` (seit 07.11.2026 im Bot; ersetzt `knowledge_base_answer.md`, der in der Git-Historie bleibt): nur aus den Texten über Chris, die `build_bot` hinten anhängt; dritte Person, „Chris“, Sprache der Frage, höchstens zwei Sätze und 200 Zeichen; fehlt die Antwort in den Texten, nur der feste Text von `career`; Ausgabe in drei Feldern `[[ ## antwort ## ]]`, `[[ ## stichwort ## ]]`, `[[ ## folgefragen ## ]]`; Präteritum für Abgeschlossenes, früheste Stelle bei „seit wann“, Pointe aufsparen, fester Satz bei Urteilsfragen; Stichwort als kurze Überschrift nach den Regeln vom 07.11. (GEPA mit Kev, `docs/backend/antwort-prompt/KEV_ODER_QWEN.md`); 0 bis 3 eigenständige Folgefragen mit Chris als Handelndem, nicht zur Familie. |
| `knowledge_base_answer_fields_end.md` | Schlusstext, der **nach** den Texten im Systemprompt stehen muss (`knowledge_base_system_prompt`): Format, Sprache der Frage und „Das Stichwort schreibst du aus deiner eigenen Antwort ab“ (stammt noch aus der Regel bis 06.11. und widerspricht den neuen Stichwort-Regeln; Klärung offen, 07.11.). Ohne ihn antwortet Gemma auf englische Fragen deutsch. |

## prompts/\_\_init\_\_.py

| Name | Was es konkret tut |
|---|---|
| `load_prompt(name)` | Liest `prompts/<name>.md` als UTF-8-Text. |
| `knowledge_base_system_prompt(prompt, knowledge, closing)` | Setzt den Systemprompt für Antworten aus der Wissensbasis zusammen: Prompt, Texte, Leerzeile, Schlusstext. `build_bot` und die Messung (`testsammlung/answer_measurement.system_prompt`) benutzen dieselbe Funktion. |
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
| `now_sentence(moment)` | Der Satz mit Datum und Uhrzeit für den Prompt, etwa „Heute ist Donnerstag, der 5. November 2026, es ist 14:30 Uhr.“ (Minute zweistellig, Stunde ohne führende Null). Wochentag und Monat aus eigenen deutschen Listen (`WEEKDAYS`, `MONTHS`), nicht von der Locale. |
| `GeneralAnswerer(model, system_prompt, clock=None)` | Beantwortet eine Frage mit einem Modellaufruf; der Bot hat drei: allgemeine Antwort (mit `clock`), Auftrag (`task_answer.md`) und Antwort aus der Wissensbasis. |
| `answer(question)` | Schickt System-Prompt und Frage und gibt den rohen Antworttext zurück (Kürzen übernimmt `check_reply`). Mit `clock` steht hinter dem Prompt eine Leerzeile und `now_sentence(clock.now())`, also Datum und Uhrzeit in deutscher Zeit, damit das Modell etwa ein Alter oder die Uhrzeit nennen kann (Datum seit 05.11.2026, Uhrzeit seit 06.11.; vorher verweigerte es „Wie alt ist Linus Torvalds?“). `LanguageModelError` geht nach oben. |

## bot.py

| Name | Was es konkret tut |
|---|---|
| `Bot(classifier, answerer, task_answerer, store, clock, log, secret, cache_version, knowledge_answerer, rewriter)` | Der Ablauf einer Frage. `cache_version` (Standard leer) geht in jeden Schlüssel des Zwischenspeichers. `knowledge_answerer` (Standard `None`) beantwortet Fragen mit der Reaktion `KNOWLEDGE_BASE_ANSWER`; ohne ihn (keine Texte in der Wissensbasis) bekommen diese Absichten ihren festen Text, im Protokoll als `fixed_text`. `rewriter` (Standard `None`, seit 13.11.2026) schreibt Nachfragen mit dem Verlauf um; ohne ihn bleibt jede Frage, wie sie ist. |
| `ask(question, ip, conversation=None)` | Misst die Dauer, bildet das Besucherkürzel, lässt `_decide` entscheiden, merkt sich mit `_remember` Folgefragen und Austausch und schreibt ein Protokoll (Frage, Absicht als Kürzel, Ergebnis, Antwort, Kürzel, Dauer in ms; nie die IP und nie die Gesprächs-ID; dazu `keyword` und `suggestions`, wenn die Antwort welche hat, `suggested: true`, wenn die Frage eine vorgeschlagene Folgefrage war, und `rewritten` mit der umgeschriebenen Frage, wenn sie sich geändert hat). `conversation` ist die Gesprächs-ID (ADR 0005); ohne sie gelten Folgefragen nur für dasselbe Besucherkürzel. Gibt die `Answer` zurück. |
| `_remember(outcome, question, scope, day, conversation)` | Nur nach einer Antwort des Modells (`answered`) oder aus dem Zwischenspeicher (`cache`): jede Folgefrage unter `suggestion_key(…, scope)` merken (`scope` ist die Gesprächs-ID, sonst das Besucherkürzel), und mit Gesprächs-ID die eigenständige Frage samt Antworttext als `Exchange` unter `conversation_key`. Feste Texte und Ausfälle lassen den letzten Austausch stehen. |
| `_decide(question, tag, scope, day, conversation)` | 1. Tageszähler hochzählen; über 2.000: feste Antwort. 2. Hat der Bot genau diese Frage heute in diesem Gespräch als Folgefrage vorgeschlagen (`suggestion_key` mit `scope`), gilt sie ohne Umschreiben und ohne Türsteher als Laufbahn (aus dem Zwischenspeicher, falls dort, sonst neu, markiert als `suggested`). 3. Sonst `_standalone`: mit dem Verlauf umgeschrieben; ab hier gilt die umgeschriebene Frage. 4. Zwischenspeicher: gleiche Frage heute schon beantwortet, dann diese Antwort (als JSON gespeichert, über `Answer.from_dict` gelesen, samt Stichwort und Folgefragen). 5. Absicht bestimmen, fällt das Modell aus: „nicht erreichbar“. 6. Reaktion (`_react`) nach `reaction_for`: fester Text oder Gimmick → `intent_answer` in der Sprache der Frage, ohne weiteren Modellaufruf (Ergebnis `fixed_text` bzw. `gimmick`); dazu `gimmick_for(intent)` als `gimmick` der Antwort (bei Flirt, Bild und sexuell ein Objekt, sonst keins); Wissen/Smalltalk/Live-Daten/Auftrag, mit Wissensbasis auch Laufbahn → `_answer_with_model` (zählt für die Besuchergrenze von 10). Hat die Reaktion keinen Antwortgeber, heißt das Ergebnis `fixed_text`. |
| `_answer_with_model(...)` | Besucherzähler hochzählen; über 10: feste Antwort. Den Antwortgeber der Reaktion fragen (allgemein, Auftrag oder Wissensbasis) und mit `_checked_answer` prüfen; Modellausfall oder leerer Text: „nicht erreichbar“ (Absicht bleibt im Protokoll). Sonst die ganze Antwort als JSON (`to_dict`) im Zwischenspeicher ablegen, außer bei der allgemeinen Antwort: Sie kennt die Uhrzeit und würde veralten (seit 06.11.2026); sie ist kurz und billig. Die Folgefragen merkt sich `_remember`. |
| `_react(question, tag, day, language, intent)` | Letzter Schritt von `_decide`: fester Text oder Gimmick, sonst `_answer_with_model`. |
| `_cached(question, day)` | Die heute schon gegebene Antwort auf diese Frage als Ergebnis `cache`, sonst `None`. |
| `_standalone(question, conversation)` | Ohne Gesprächs-ID, ohne Umschreiber oder ohne gemerkten Austausch die Frage unverändert; sonst `rewriter.rewrite(frage, letzter Austausch)`. |
| `_checked_answer(reply, reaction)` | Bei der Wissensbasis (seit 07.11.2026): Felder lesen (`read_answer_fields`), Stichwort und Folgefragen prüfen (`checked_answer_fields`, was durchfällt, entfällt), den Antworttext mit `check_reply` prüfen. Sonst nur `check_reply` auf die ganze Ausgabe, ohne Stichwort und Folgefragen. |
| `_fixed(kind, language, name, intent)` | Verpackt eine feste Antwort samt Ergebnisname für das Protokoll. |

## answer_fields.py

Liest und prüft Antwort, Stichwort und Folgefragen (Regeln K12, K15, K16, K28 aus
`docs/backend/antwort-prompt/KRITERIEN.md`). **Noch nicht im Bot**, nur in der Messung und im
Training der Antworten; der Code-Schritt des Plans „Stichwort und Folgefragen“ baut es ein.

| Name | Was es konkret tut |
|---|---|
| `NOT_YET_TEXTS`, `CANNOT_HELP_TEXTS` | Die festen Texte „Darüber lerne ich gerade noch.“ / „I can answer that soon.“ und „Dabei kann ich leider nicht helfen.“ / „I'm afraid I can't help you with that.“. |
| `MAX_KEYWORD_WORDS`, `MAX_KEYWORD_LENGTH`, `MAX_SUGGESTIONS`, `MAX_SUGGESTION_LENGTH` | 2 Wörter und 24 Zeichen für das Stichwort (seit 06.11.2026; vorher 1 Wort, 20 Zeichen), 3 Folgefragen, 300 Zeichen. |
| `AnswerFields(answer, keyword, suggestions)` | Was der Besucher bekommt; `keyword` kann `None`, `suggestions` leer sein. |
| `read_answer_fields(reply)` | Liest die Felder `antwort`, `stichwort`, `folgefragen` (eine je Zeile, Listenzeichen entfernt). Ohne Feldmarken ist alles die Antwort; fehlt ein Feld, entfällt nur dieses; fehlt `antwort`, gilt der Text vor der ersten Marke. |
| `_split_fields(reply)` | Text je Feldname bis zur nächsten Marke, unter `""` der Text davor; ohne Marke leer. |
| `is_fixed_text(answer)` | Ob die Antwort einer der vier festen Texte ist. |
| `keyword_problem(keyword)` | Grund, warum das Stichwort nicht taugt, sonst `None`: mehr als zwei Wörter, über 24 Zeichen, enthält „Chris“ als eigenes Wort („ChrisBot“ ist erlaubt), ein Wort nicht darstellbar. Seit 06.11.2026 eine kurze Überschrift, die nicht in der Antwort stehen muss; ob sie passt, prüft der Richter (K13, K33). |
| `suggestion_problem(suggestion, earlier)` | Grund, warum die Folgefrage nicht taugt, sonst `None`: endet nicht mit „?“, nennt „Chris“ nicht als eigenes Wort (also auch nicht „ChrisBot“), über 120 Zeichen (bis 13.11.2026: 300), enthält ein Anweisungswort aus `INSTRUCTION_WORDS` („ignorier“, „vergiss“, „anweisung“, „prompt“, „systemnachricht“, „ignore“; seit 13.11.2026, Folgefragen-Lücke), doppelt zu `earlier`. Ein zweites „?“ ist erlaubt, weil ein Projekt „Wer war's?“ heißt. |
| `checked_answer_fields(fields)` | Behält nur, was besteht, höchstens drei Folgefragen in Reihenfolge. Bei festem Text nur die Antwort. |
| `contains_word(text, word)` | Ob `word` als eigenes Wort in `text` steht (Groß/klein egal, Bindestrich zählt zum Wort). |

## question_rewriter.py (13.11.2026, ADR 0005)

| Name | Was es konkret tut |
|---|---|
| `Exchange(question, answer)` | Der letzte Austausch eines Gesprächs: die (schon eigenständige) Frage und der Antworttext des Bots. |
| `Exchange.to_json()` / `Exchange.from_json(text)` | Hin und zurück als JSON `{"question", "answer"}`, so steht der Austausch im Speicher. |
| `QuestionRewriter(model, system_prompt)` | Schreibt Nachfragen mit dem Verlauf eigenständig um; `build_bot` gibt ihm Gemma mit Temperatur 0 und höchstens 150 Tokens (`REWRITER_TEMPERATURE`, `REWRITER_MAX_TOKENS`) und den Prompt `rewrite_question.md`. |
| `rewrite(question, before)` | Ein Modellaufruf: Systemprompt, dann „Vorige Frage: …“, „Antwort des Chatbots: …“, „Neue Frage: …“. Gibt die erste nicht leere Zeile der Antwort ohne Rand-Leerraum zurück. Bleibt keine, ist sie länger als 500 Zeichen (`MAX_REWRITTEN_LENGTH`) oder fällt das Modell aus, die Frage unverändert. |
