# scripts

Hilfsskripte. Aufruf aus beliebigem Verzeichnis, sie wechseln selbst nach `backend/`.

| Skript | Was es konkret tut |
|---|---|
| `check.sh` | Führt nacheinander aus: `uv sync --locked --inexact` (entfernt nichts, damit ein laufendes Training DSPy behält), `ruff format --check`, `ruff check`, `mypy`, `pytest` (bricht unter 100 % Zeilen- und Zweigabdeckung ab), `lint-imports` (Architekturtest). Bricht beim ersten Fehler ab. |
| `build_package.sh` | Baut `build/lambda.zip`. Exportiert die Laufzeitabhängigkeiten aus `uv.lock` (ohne Gruppen `dev` und `dspy`), installiert sie als Linux-arm64-Räder (Python 3.14) nach `build/package` (und entfernt die leere Sperrdatei `.lock`, die uv dabei anlegt), kopiert `src/bot` dazu (ohne `__pycache__` und `doc.md`) und alle Texte aus `wissensbasis/stationen/`, `projekte/` und `anekdoten/` an dieselben Stellen im Paket, sonst nichts aus der Wissensbasis, dazu `lebenslauf/varianten.yaml` für den Lebenslauf-Endpunkt (Quelle mit `WISSENSBASIS_DIR` ersetzbar; ein Text mit „(offen:“ bricht mit Fehler ab), packt alles mit fester Reihenfolge und Zeitstempel in ein ZIP und gibt ZIP- und entpackte Größe aus. Bricht ab, wenn DSPy im Paket steckt. Mit `--with PAKET==VERSION` wird ein Paket nur für eine Größenmessung hinzugenommen, ohne `pyproject.toml` oder Lock-Datei zu ändern. |
| `measure_cold_start.sh [N]` | Baut das Paket, falls nötig, und startet N-mal (Standard 5) einen frischen Container aus `public.ecr.aws/lambda/python:3.14` (x86_64) mit dem Paket unter `/var/task`. Ruft den Handler einmal über den eingebauten Runtime Interface Emulator auf und gibt die Init-Dauer (Python starten, Handler importieren) und die Dauer des ersten Aufrufs aus. Räumt Container und temporäres Verzeichnis selbst auf. Kein AWS-Zugriff. |

## protokoll.sh [TAGE]

Holt mit `aws logs filter-log-events` alle Protokollzeilen der Lambda
`christianhoerauf-bot` aus den letzten TAGE Tagen (Standard 2), die eine Frage enthalten. `jq`
zerlegt sie und gibt je Frage aus: Uhrzeit (Berlin), erkannte Absicht (`–`, wenn keine), Ausgang,
Dauer, Besucherkürzel (hinter dem Ausgang „(Folgefrage)“, wenn der Besucher eine vorgeschlagene Folgefrage gestellt hat), dann Frage (`F:`) und Antwort (`A:`), bei Antworten aus der Wissensbasis
dazu das Stichwort (`S:`) und je Folgefrage eine Zeile (`?:`). Am Ende steht, wie viele Fragen von
wie vielen verschiedenen Besuchern kamen. Zeilen ohne Frage oder ohne JSON werden übersprungen.
Braucht `aws` mit Zugangsdaten und `jq`. Der Zugriff ist nur lesend und kostet nichts.

## fehler.sh [TAGE]

Fehlerbericht. Holt alle Protokollzeilen der Lambda `christianhoerauf-bot` aus den letzten TAGE
Tagen (Standard 2) und gibt mit `jq` drei Abschnitte aus:

- **Aufrufe:** Zahl der `REPORT`-Zeilen (eine je Aufruf), davon mit Kaltstart (`Init Duration`),
  längste Dauer in ms und höchster Speicherverbrauch.
- **Fehler:** jede Zeile der Lambda-Laufzeit mit `[ERROR]`, `Traceback`, `Task timed out` oder
  `Status: error/timeout`, mit Uhrzeit (Berlin) und eingerückt, bei Tracebacks alle Zeilen. Die
  JSON-Zeilen des Bots zählen nie als Fehler, auch wenn eine Frage solche Wörter enthält.
- **Feste Antworten wegen Ausfall oder Grenze:** Fragen mit Ausgang `unavailable` (Modell nicht
  erreichbar), `limit` (Tagesgrenze) oder `visitor_limit` (Besuchergrenze).

Braucht `aws` mit Zugangsdaten und `jq`. Der Zugriff ist nur lesend.

## frage.sh "FRAGE"

Stellt dem ausgerollten Bot eine Frage und druckt die Antwort als JSON (mit `jq` formatiert, eine
Fehlerseite unverändert). Adresse aus `ANSWER_URL`, sonst die Function URL des ersten Ausrollens.
Ohne genau einen nicht leeren Parameter: Aufrufhinweis, Exit 2. Kein eigener Test (Christians
Wunsch); geprüft per Aufruf. Jede Frage zählt zur Tagesgrenze, gleiche Fragen kommen am selben Tag
aus dem Zwischenspeicher.

## Ziel wählen: `--ziel`

`messe.sh`, `trainiere.sh`, `run_testsammlung.sh` und `zweite_sicherung.sh` laufen ohne Angabe
gegen LM Studio auf dem Mac mini. `--ziel dgx` nimmt LM Studio auf der DGX Spark, `--ziel bedrock`
Bedrock in Frankfurt wie im Betrieb (nur Messungen, nicht `trainiere.sh`; braucht
AWS-Zugangsdaten und kostet). Die Liste der Rechner und alles Weitere steht in
`testsammlung/targets.py` und `testsammlung/doc.md`, Abschnitt „Auf welchem Rechner“.

## zweite_sicherung.sh [--ziel macmini|dgx|bedrock]

Startet `python -m testsammlung.backstop`: stellt alle Testfragen, die eine feste Reaktion
brauchen (138 Stück), direkt beiden Antwort-Prompts von Gemma auf dem Ziel (Standard Mac mini),
am Türsteher vorbei, dazu harmlose Fragen. Etwa 10 Minuten. Druckt, wie viele Gemma selbst abweist, jede frei
beantwortete Frage und harmlose Fragen, die zu Unrecht abgewiesen wurden. Legt die Ausgabe
zusätzlich als `tmp/zweite_sicherung_<Datum>_<Uhrzeit>.txt` ab, zum Vergleich vor und nach einer
Änderung an `general_answer.md` oder `task_answer.md`. Synchronisiert mit `--inexact`, damit ein
laufendes Training DSPy behält.

## run_testsammlung.sh [--ziel macmini|dgx|bedrock]

Synchronisiert die Umgebung und startet `python -m testsammlung.runner` mit den übergebenen
Argumenten. Ohne Argument gegen LM Studio auf dem Mac mini, mit `--ziel dgx` auf der DGX Spark, mit
`--ziel bedrock` gegen Bedrock (AWS-Aufruf, Kosten im Cent-Bereich, nur von Hand).

## trainiere.sh [--ziel macmini|dgx]

Holt die Gruppe `dspy` dazu und startet `python -m testsammlung.training`: trainiert den
Türsteher mit DSPy gegen LM Studio auf dem Mac mini oder mit `--ziel dgx` auf der DGX Spark (etwa
35 min; `bedrock` ist nicht erlaubt), überschreibt das Kompilat in
`testsammlung/kompilat/` und exportiert es nach `src/bot/pipeline/prompts/intent_program.json`.
Druckt vorher die Bewertungsfragen je Absicht. Bricht ab, wenn `absichten.yaml` nicht zu `Intent`
passt, die Bewertungsfragen nicht ausgewogen sind (`balance_problems`) oder der Rechner nicht
erreichbar ist. Optionen:
- `--nur-export`: kein Training, nur der Export aus dem vorhandenen Kompilat.
- `--nur-pruefen`: nur die Tabelle und die Prüfung, ohne LM Studio; Exit 0 ausgewogen, 2 nicht.
- `--trotzdem`: trainieren, auch wenn die Prüfung etwas findet.

Ein altes Kompilat muss nicht gelöscht werden.

## messe.sh [--ziel macmini|dgx|bedrock] [--tuersteher DATEI]

Startet `python -m testsammlung.measurement` und reicht alle Argumente durch: stellt alle
Testfragen dem Türsteher des Bots (etwa 5 min), druckt Quoten und Fehlgriffe und schreibt
`testsammlung/kompilat/messung.json` mit Modell und Ziel. Exit 0 bestanden, 1 nicht bestanden.
Mit `--tuersteher DATEI` misst es eine Variante des Türstehers und legt den Bericht als
`<name>.messung.json` neben die Datei; die eingecheckte Messung bleibt dann unberührt.
Ziel ohne Angabe der Mac mini; `--ziel dgx` die DGX Spark; `--ziel bedrock` Bedrock wie im
Betrieb (AWS-Zugangsdaten, Kosten). Das Ziel ändert den Fingerabdruck nicht, eine bestandene
Messung auf jedem Ziel macht `tuersteher_stand.sh` zufrieden.


## wuerfle.sh [--ziel macmini|dgx|bedrock] [--anzahl N] [--tuersteher DATEI]

Startet `python -m testsammlung.sampling` und reicht alle Argumente durch: stellt jede Frage aus
`testsammlung/wuerfelfragen.yaml` N-mal (Standard 20) mit Temperatur 1 dem Türsteher und druckt je
Frage, welche Absicht wie oft kam. Schreibt nichts. Auf Bedrock kostet jeder Aufruf; 11 Fragen × 20
sind unter 10 Cent.

## messe_antworten.sh [--ziel …] [--prompt DATEI] [--schluss DATEI] [--teil lernen|pruefen|alle] [--runden N] [--fragen DATEI] [--aus DATEI]

Startet `python -m testsammlung.answer_measurement`: Gemma auf dem Ziel beantwortet die Fragen
(Standard: Prüffragen aus `docs/backend/antwort-prompt/fragen_antworten.yaml`, eine Runde) mit dem
Prompt samt Texten der Wissensbasis und Schlusstext; Qwen auf der DGX bewertet nach
`KRITERIEN.md`, der Türsteher auf dem Ziel stuft die Folgefragen ein. Druckt mittlere Note,
verletzte muss-Kriterien, K32, Folgefragen je Antwort und die Fehler je Kriterium; Einzelheiten in
`versuche/antworten.<ziel>.json`. Mit `--ziel bedrock` kostet es (nur Gemma und Türsteher laufen
dort, der Richter bleibt auf der DGX).

## pruefe_fragen.sh [NAME …] [OPTIONEN]

Prüft die Fragendateien `docs/backend/antwort-prompt/fragen_<NAME>.yaml` (ohne Namen alle: testperson,
testperson_schwer, pointe, echt, probe, antworten) nacheinander mit `messe_antworten.sh`, je mit
`--teil alle` und der passenden Wissensbasis: `testsammlung/testperson` für testperson,
testperson_schwer und pointe, sonst die echte. Ein Argument, zu dem es keine Fragendatei gibt, geht
als Option weiter (`--ziel dgx --runden 2`). Erwartete Wörter zählen als K5, verbotene als K10, `art:
fehlt` als K6. Einzelheiten in `versuche/fragen.<NAME>.json`. Auf der DGX etwa 30 s je Antwort: alle
128 Fragen gut eine Stunde je Runde. Unbekannter Name: Exit 2.

## pruefe_besucherpfade.sh [aufzeichnen|bewerten] [OPTIONEN] (12.11.2026)

Integrationstest „Besucherpfade“ (`docs/backend/INTEGRATIONSTEST.md`), nur LM Studio, nie Bedrock.
Ohne Unterbefehl beide Schritte auf der DGX: `python -m testsammlung.visitor_recording --ziel dgx`
mit allen Optionen (etwa `--tiefe 1 --persona personalerin`), danach `python -m
testsammlung.visitor_review versuche/besucherpfade/aufzeichnung.dgx.jsonl --richter dgx`.
`aufzeichnen …` und `bewerten …` starten nur den einen Schritt mit den Optionen dahinter, etwa auf
dem Mac mini (dort zwischen den Schritten in LM Studio Gemma entladen und Qwen laden). Ergebnisse in
`versuche/besucherpfade/`. Nach einem Abbruch setzen `aufzeichnen --ziel dgx --fortsetzen` und
`bewerten <aufzeichnung> --fortsetzen` dort fort, wo sie waren. Exit 0 ohne Muss-Verstoß, 1 mit, 2
bei falschem Aufruf.

## eiche_richter.sh, pruefe_sollwerte.sh

Starten `python -m testsammlung.calibration` mit dem Unterbefehl `richter` oder `sollwerte`
und prüfen, ob die Modelle wie Christian urteilen:

- `eiche_richter.sh`: Qwen (DGX) beurteilt die 90 Folgefragen aus `eichung_richter.yaml` nach K17
  und K24. Druckt die Übereinstimmung mit Christian und jede Abweichung. Etwa 6 Minuten.
- `pruefe_sollwerte.sh [--fragen DATEI] [--prompt DATEI] [--runden N] [--ziel …]`: Gemma (Standard
  DGX) beantwortet die Fragen aus `sollwerte_stichwort.yaml`, das Stichwort wird an den Sollwerten
  gemessen, sonst mit Kev verglichen. Etwa 2 Minuten je Runde für alle 80 Fragen.

Einzelheiten in `versuche/eichung.<prüfung>.json`. Kein Bedrock. `messe_antworten.sh`,
`eiche_richter.sh` und `pruefe_sollwerte.sh` gleichen die Umgebung mit `uv sync --inexact` ab, damit
DSPy eines laufenden Trainings (GEPA) stehen bleibt. `eiche_stichwort.sh` (Qwen gegen
die 49 Stichwort-Urteile, K13) ist seit 07.11.2026 stillgelegt: Die Urteile stammen aus der Zeit
vor der Oberbegriff-Regel; Sollwerte und Kev übernehmen die Aufgabe.

## trainiere_antworten.sh [--ziel macmini|dgx] [--budget N] [--probe] [--prompt DATEI] [--fragen DATEI] [--aus ORDNER]

Startet `python -m testsammlung.answer_training` mit der Gruppe `dspy`: GEPA trainiert den Prompt
für Antworten aus der Wissensbasis. Gemma auf dem Ziel (Standard DGX) antwortet auf die Lernfragen,
die Bewertung von `messe_antworten.sh` gibt Note und Rückmeldung, Qwen auf der DGX schreibt die
Anweisung um. Ergebnis in `versuche/gepa/prompt.md` und `verlauf.json`; übernommen wird nichts
automatisch. Budget 400 Bewertungen sind etwa 4 Stunden. Kein Bedrock.
## tuersteher_stand.sh

Startet `python -m testsammlung.fingerprint`: zeigt in einer Sekunde und ohne Netz, ob Training
und Messung zum Stand im Repo passen und ob die Messung bestanden ist, und nennt sonst das
Skript, das weiterhilft. Exit 0 oder 1.

## Git-Hooks (`/.githooks/`)

Eingeschaltet einmalig mit `git config core.hooksPath .githooks` im Wurzelverzeichnis.

- `pre-commit`: druckt den Stand wie `tuersteher_stand.sh`, hält den Commit nie an.
- `pre-push`: hält den Push an, wenn Training oder Messung fehlen, veraltet oder nicht bestanden
  sind. Geprüft wird das Arbeitsverzeichnis. Notausgang: `git push --no-verify`.
