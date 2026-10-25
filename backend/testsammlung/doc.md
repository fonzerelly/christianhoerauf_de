# testsammlung

Kleine Sammlung von Fällen (Q42) und der Läufer dazu. Gehört nicht ins Lambda-Paket. Start mit
`scripts/run_testsammlung.sh [--target bedrock]`.

## cases.yaml

Liste von Fällen: `question`, `intent` (ein Kürzel aus `docs/backend/ABSICHTEN.md` oder mehrere,
durch Leerzeichen getrennt, die alle als richtig gelten), optional `group: arithmetic`
(Rechenfrage), `must_contain`, `must_not_contain`. Aktuell 10 allgemeine Fragen, 9 über Christian,
9 Umgehungsversuche und heikle Fragen und 4 Rechenfragen. Die große Messung mit 216 Fragen liegt
noch in `experiments/absichten/` (Plan „Absichten neu“, Schritt C).

## cases.py

| Name | Was es konkret tut |
|---|---|
| `Case` | Ein Fall: Frage, erlaubte Absichten (`intents`), Gruppe, Pflichtwörter und verbotene Wörter der Antwort. `Case.intent` ist die erste erlaubte, die Hauptabsicht. |
| `load_cases(path)` | Liest eine YAML-Datei in eine Liste von `Case`. `intent` als Liste oder durch Leerzeichen/Komma getrennt (`_labels`); fehlt `group`, gilt `intent`. |

## runner.py

| Name | Was es konkret tut |
|---|---|
| `CaseResult` | Ergebnis eines Falls: tatsächliche Absicht (`None` bei Modellausfall), Antwort, ob die Wortprüfung stimmt. `intent_ok` ist wahr, wenn die Absicht eine der erlaubten ist. |
| `run_case(case, classifier, answerer)` | Bestimmt die Absicht. Bei Rechenfragen oder Wortprüfung holt sie auch die Antwort und prüft Pflicht- und verbotene Wörter. Modellausfall zählt als Fehlschlag. |
| `summarize(results)` | Text mit Trefferquote je Hauptabsicht, jedem Fehlgriff (mit allen erlaubten Absichten) und dem Ergebnis der Rechenfragen samt falschen Antworten. |
| `build_model(target)` | `lmstudio`: Mac mini (`192.168.178.91:1234`, ohne Schlüssel). `bedrock`: Bedrock Frankfurt mit den AWS-Zugangsdaten des Aufrufers. Anderes Ziel: `ValueError`. |
| `main(argv, model_factory)` | Liest `--target` und `--cases`, lässt alle Fälle mit dem exportierten Türsteher (`intent_program.json`) und dem allgemeinen Antwort-Prompt laufen, druckt die Zusammenfassung, gibt 0 zurück. Ein Modell für beide Schritte, ohne eigene `temperature`. |
