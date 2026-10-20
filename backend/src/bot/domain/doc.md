# domain

Die Fachlogik des Bots, ohne Ein- und Ausgabe: kein AWS, kein HTTP, kein DSPy. Dieser Ordner
importiert nur sich selbst (der Architekturtest `lint-imports` prüft das).

## answer.py

| Name | Was es konkret tut |
|---|---|
| `Answer` | Unveränderliche Antwort des Bots (Vertrag laut ADR system/0003). Felder: `text` (immer) und `gimmick` (ein Dict oder `None`). |
| `Answer.to_dict()` | Liefert die Antwort als Dict, das sich direkt als JSON ausgeben lässt: immer `{"text": ...}`; der Schlüssel `gimmick` kommt nur dazu, wenn ein Gimmick gesetzt ist. |
