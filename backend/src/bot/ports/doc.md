# ports

Schnittstellen zur Außenwelt. Importiert nur `domain`. Sprachmodell, Zähler-Speicher, Uhr und Protokoll.

## language_model.py

| Name | Was es konkret tut |
|---|---|
| `Message` | Eine Nachricht an das Modell: `role` (`system`/`user`) und `content`. |
| `LanguageModelError` | Jeder Ausfall des Modells (nicht erreichbar, Zeitlimit, HTTP-Fehler, unbrauchbare Antwort). Die Meldung enthält nie den Schlüssel. |
| `LanguageModel.complete(messages)` | Schickt die Nachrichten ans Modell und liefert den Antworttext oder wirft `LanguageModelError`. |

## counter_store.py

| Name | Was es konkret tut |
|---|---|
| `CounterStore.increment(key)` | Zählt den Zähler `key` um eins hoch und gibt den neuen Stand zurück. |
| `CounterStore.read(key)` | Gibt den unter `key` gespeicherten Text zurück oder `None`. |
| `CounterStore.write(key, value)` | Speichert einen Text unter `key`. Einträge verfallen von selbst. |

## clock.py

| Name | Was es konkret tut |
|---|---|
| `Clock.today()` | Das heutige Datum (bestimmt Tageszähler, Tagessalz, Zwischenspeicher). |
| `Clock.seconds()` | Sekunden zum Messen von Dauern. |

## log.py

| Name | Was es konkret tut |
|---|---|
| `Log.write(record)` | Schreibt einen Protokolleintrag (Dict). |
