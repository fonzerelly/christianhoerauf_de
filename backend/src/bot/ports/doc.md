# ports

Schnittstellen zur Außenwelt. Importiert nur `domain`. Bisher nur das Sprachmodell; Zähler-Speicher,
Uhr und Protokoll kommen mit Schritt 5.

## language_model.py

| Name | Was es konkret tut |
|---|---|
| `Message` | Eine Nachricht an das Modell: `role` (`system`/`user`) und `content`. |
| `LanguageModelError` | Jeder Ausfall des Modells (nicht erreichbar, Zeitlimit, HTTP-Fehler, unbrauchbare Antwort). Die Meldung enthält nie den Schlüssel. |
| `LanguageModel.complete(messages)` | Schickt die Nachrichten ans Modell und liefert den Antworttext oder wirft `LanguageModelError`. |
