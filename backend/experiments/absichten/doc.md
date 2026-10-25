# Absichten-Experiment

Vergleicht Türsteher-Varianten für die 18 Absichten aus `docs/backend/ABSICHTEN.md`, lokal
gegen LM Studio auf dem Mac mini. Kein Teil des Lambda-Pakets, keine Unit-Tests: Experimentcode,
der nur misst. Wird er zum festen Messbefehl, kommt er mit Tests nach `testsammlung/`.

Aufruf aus `backend/`:

```
uv run --group dspy --with optuna python experiments/absichten/lauf.py          # alle Schritte
uv run --group dspy --with optuna python experiments/absichten/lauf.py gemma_dspy   # nur ein Schritt
uv run python experiments/absichten/auswertung.py                  # Bericht schreiben
uv run --group dspy python experiments/absichten/export_prompt.py   # Türsteher fürs Lambda exportieren
```

## Dateien

- `absichten.yaml`: Regeln, Beschreibung und ein Beispiel je Absicht. Daraus entstehen alle
  Prompts, damit jede Variante denselben Inhalt bekommt.
- `fragen_test.yaml`: 216 Testfragen (12 je Absicht), nur zum Messen.
- `fragen_training.yaml`: 180 Trainingsfragen (10 je Absicht) für DSPy und die Beispiele.
- `ergebnisse/`: eine JSON-Zeile je Frage und Schritt, das DSPy-Programm, der Bericht.

## gemeinsam.py

- `gruppe(kuerzel)`: erste Stufe einer Absicht, also der Teil vor dem `/`.
- `lade_absichten()`: liest `absichten.yaml` in ein `Absichten`-Objekt (Regeln, Beschreibungen,
  Beispiele). `Absichten.kuerzel` ist die Liste der 18 Kürzel.
- `lade_fragen(name)`: liest `fragen_<name>.yaml` als Liste von `Frage` (Text, erlaubte
  Absichten, Grenzfall). `absicht` darf mehrere Kürzel enthalten, als YAML-Liste oder durch
  Leerzeichen/Komma getrennt; dann gilt jedes davon als richtig.
- `Frage.absicht`: die erste erlaubte Absicht (Hauptabsicht); danach wird je Absicht gezählt.
- `Frage.bezug(erkannt)`: die erlaubte Absicht, an der gemessen wird: die erkannte, wenn sie
  erlaubt ist; sonst eine erlaubte aus derselben Gruppe; sonst die Hauptabsicht.
- `dspy_anweisung(absichten)`: Aufgabe, Regeln und Absichten als Text, ohne Beispiele. Start
  für DSPy und Kern der anderen Prompts.
- `gemma_prompt(absichten)`: der handgeschriebene Türsteher-Prompt: `dspy_anweisung` plus ein
  Beispiel je Absicht plus „Antworte mit genau einem Kürzel“.
- `safeguard_richtlinie(absichten)`: dieselben Inhalte im Aufbau, den gpt-oss-safeguard
  erwartet (Aufgabe, Absichten, Regeln, Beispiele, Ausgabe als JSON mit `label`).
- `PRUEF_RICHTLINIE` und `pruef_inhalt(frage, antwort)`: Richtlinie und Eingabe für die Prüfung
  einer Gemma-Antwort; Ausgabe JSON mit `violation` 0 oder 1.
- `chat(modell, system, nutzer, **weitere)`: ein Aufruf von `/chat/completions` in LM Studio.
  Misst die Dauer, gibt Text und Zahl der Ausgabe-Tokens zurück. Bei Netzfehlern bis zu fünf
  Wiederholungen mit wachsender Pause (5 s bis 5 min).
- `aufwaermen(modell)`: ein winziger Aufruf, damit LM Studio das Modell lädt, bevor gemessen wird.
- `kuerzel_im_text(text, kuerzel)`: liest ein Kürzel aus freier Ausgabe: erst die erste Zeile
  genau, sonst das längste Kürzel, das im Text vorkommt; sonst None.
- `json_im_text(text)`: erstes JSON-Objekt im Text oder None.
- `safeguard_kuerzel(text, kuerzel)`: `label` aus dem JSON, sonst wie `kuerzel_im_text`.
- `safeguard_verstoss(text)`: True/False aus `violation`, None wenn unlesbar.
- `Ergebnisdatei(name)`: `ergebnisse/<name>.jsonl`. `hat(frage)` sagt, ob die Frage schon
  erledigt ist; `schreibe(eintrag)` hängt eine Zeile an. So setzt ein abgebrochener Lauf fort.

## lauf.py

Schritte in dieser Reihenfolge (erst Gemma, dann Safeguard, damit LM Studio nur einmal das
Modell wechselt):

- `gemma_handprompt`: Gemma stuft jede Testfrage mit `gemma_prompt` ein (temperature 0, ohne
  Nachdenken).
- `gemma_dspy_training`: baut ein `dspy.Predict` (Frage → eine der 18 Absichten) und optimiert
  es mit MIPROv2 (`auto="medium"`) auf der Trainingsmenge: je Absicht 6 Fragen zum Lernen, 4 zum
  Bewerten. Gemma ist dabei ausführendes Modell (temperature 0) und Ideengeber für neue
  Anweisungen (temperature 1). Metrik: 1 für die richtige Absicht, 0,5 für die richtige Gruppe.
  Speichert `gemma_dspy_programm.json` und den fertigen Prompt lesbar in
  `gemma_dspy_prompt.txt`. Überspringt das Training, wenn das Programm schon da ist.
- `gemma_dspy`: lädt das Programm und stuft jede Testfrage ein. Unlesbare Ausgabe zählt als
  Fehlgriff.
- `gemma_antworten`: Gemma beantwortet jede Testfrage mit dem Antwort-Prompt aus dem
  Live-Betrieb (`src/bot/pipeline/prompts/general_answer.md`). Damit lässt sich für jede
  Variante nachspielen, was ein Besucher sähe, wenn der Türsteher die Frage durchlässt.
- `safeguard_low`, `safeguard_medium`: gpt-oss-safeguard stuft jede Testfrage mit
  `safeguard_richtlinie` ein, mit wenig bzw. mittlerem Nachdenken.
- `safeguard_pruefung`: Safeguard prüft jede Gemma-Antwort mit `PRUEF_RICHTLINIE`.
- `main(namen)`: führt die genannten oder alle Schritte aus, wärmt bei jedem Modellwechsel auf,
  läuft bei einem Fehler mit dem nächsten Schritt weiter und meldet am Ende, was fehlschlug.

## auswertung.py

Spielt jede Variante über alle Testfragen nach und schreibt `ergebnisse/auswertung.md`.

- `tuersteher_absichten(name, kuerzel)`: liest die erkannte Absicht je Frage neu aus der
  Rohausgabe.
- `reaktion(absicht)`: `gemma` für Absichten, auf die Gemma frei antwortet (knowledge, smalltalk,
  task), sonst die Absicht selbst (= feste Reaktion), `unlesbar` für None.
- `ausgang(erwartet, erkannt, blockiert)`: was beim Besucher ankommt:
  - richtig: die vorgesehene Reaktion;
  - abgefangen: die Prüfung hat eine Antwort zurückgehalten, die nicht hätte kommen dürfen
    (oder der Türsteher war unlesbar), sicher, aber nicht die vorgesehene Reaktion;
  - falsche feste Reaktion: eine andere feste Reaktion als vorgesehen;
  - zu Unrecht abgewiesen: Gemma hätte antworten sollen, durfte aber nicht;
  - durchgerutscht, leicht: Gemma antwortet, obwohl eine feste Reaktion vorgesehen war
    (bot, flirt, advice, politics, gibberish);
  - durchgerutscht, kritisch: dasselbe bei sensitive, jailbreak oder christian.
- `stufe2_nach_q5(erwartet, erkannt)`: Treffer nach Entscheidung Q5: bei christian/* außer
  picture genügt die richtige Gruppe.
- `_pruefung_allein(...)`: Fehlalarme und Fänge der Prüfung über alle Testfragen.
- `_fehlgriffe(...)`: jede falsch eingestufte Frage je Variante, bei durchgerutschten mit
  Gemmas Antwort und dem Prüfergebnis.
- Die Dauer je Frage ist Türsteher plus, falls Gemma antwortet, Antwort plus, falls geprüft,
  Prüfung. Gemessen am Mac mini, nicht auf Bedrock.

## export_prompt.py

Exportiert das DSPy-Programm `ergebnisse/gemma_dspy_programm.json` für das Lambda (ADR 0002).
DSPy kommt nicht ins Lambda; dort wird nur noch die Frage eingesetzt.

- `main()`: lädt das Programm wie `lauf.py`, lässt DSPys `ChatAdapter` die Nachrichten für einen
  Platzhalter bauen und teilt die letzte Nachricht am Platzhalter in Anfang und Ende. Schreibt
  `src/bot/pipeline/prompts/intent_program.json` (Kürzel, feste Nachrichten, Anfang, Ende) und
  `tests/pipeline/intent_golden.json` (DSPys Nachrichten für drei Beispielfragen, auch mit
  Zeilenumbruch und Feldmarkierung) als Golden Master für den Unit-Test.
- `_schreibe(pfad, daten)`: JSON mit Umlauten und Einrückung.

Nach jedem neuen Training: exportieren, dann `scripts/check.sh` – der Golden-Master-Test zeigt,
ob der Laufzeit-Baustein noch dieselben Nachrichten baut.
