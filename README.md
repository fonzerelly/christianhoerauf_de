# christianhoerauf.de

Die Startseite von christianhoerauf.de: Ein Lichtpunkt beantwortet Fragen, indem er seinen Weg
durch ein Labyrinth nimmt. Die Buchstaben sind als Gänge im Labyrinth versteckt und werden
erst durch seine Leuchtspur lesbar.

## Aufbau

| Ordner | Inhalt |
|---|---|
| `frontend/` | Neubau der Seite in TypeScript (in Arbeit) |
| `backend/` | Dienste für die Antworten (in Arbeit) |
| `prototyp/` | Prototypen 1–6; `prototyp/live/` ist die heute ausgelieferte Seite |
| `corporate-identity/` | Visitenkarte und Co. (verschlüsselt) |
| `docs/` | Glossare, Entscheidungen, Pläne (verschlüsselt) |
| `scripts/` | Hilfsskripte, z. B. `entsperren.sh` |

## Verschlüsselte Ordner

`docs/` und `corporate-identity/` sind mit [git-crypt](https://github.com/AGWA/git-crypt)
verschlüsselt. Ohne Schlüssel sind die Dateien dort unlesbar; alles andere ist offen.
