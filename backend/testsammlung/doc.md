# testsammlung

Kleine Sammlung von Fällen (Q42) und der Läufer dazu. Gehört nicht ins Lambda-Paket. Start mit
`scripts/run_testsammlung.sh [--target bedrock]`.

## cases.yaml

Liste von Fällen: `question`, `intent` (`general`, `christian`, `gimmick`, `disallowed`), optional
`group: arithmetic` (Rechenfrage), `must_contain`, `must_not_contain`. Aktuell 8 allgemeine,
8 Fragen über Christian, 8 unzulässige (inkl. Austricksversuche deutsch/englisch), 2 Gimmick-Fragen
und 4 Rechenfragen.

## cases.py

| Name | Was es konkret tut |
|---|---|
| `Case` | Ein Fall: Frage, erwartete `Intent`, Gruppe, Pflichtwörter und verbotene Wörter der Antwort. |
| `load_cases(path)` | Liest eine YAML-Datei in eine Liste von `Case`. `christian` steht für `about_christian`; fehlt `group`, gilt `intent`. |

## runner.py

| Name | Was es konkret tut |
|---|---|
| `CaseResult` | Ergebnis eines Falls: tatsächliche Absicht (`None` bei Modellausfall), Antwort, ob die Wortprüfung stimmt. `intent_ok` sagt, ob die Absicht getroffen wurde. |
| `run_case(case, classifier, answerer)` | Bestimmt die Absicht. Bei Rechenfragen oder Wortprüfung holt sie auch die Antwort und prüft Pflicht- und verbotene Wörter. Modellausfall zählt als Fehlschlag. |
| `summarize(results)` | Text mit Trefferquote je erwarteter Absicht, jedem Fehlgriff und dem Ergebnis der Rechenfragen samt falschen Antworten. |
| `build_model(target)` | `lmstudio`: Mac mini (`192.168.178.91:1234`, ohne Schlüssel). `bedrock`: Bedrock Frankfurt mit den AWS-Zugangsdaten des Aufrufers. Anderes Ziel: `ValueError`. |
| `main(argv, model_factory)` | Liest `--target` und `--cases`, lässt alle Fälle laufen, druckt die Zusammenfassung, gibt 0 zurück. |
