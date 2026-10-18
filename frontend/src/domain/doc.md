# domain

Der fachliche Kern: Schrift, Textumbruch, Labyrinth und Routenplanung. Er kennt weder Browser
noch Uhr noch `Math.random`; Zufall kommt über `RandomSource`. Der Architekturtest stellt
sicher, dass `domain` nur aus `domain` importiert.

| Ordner    | Inhalt                                                         |
| --------- | -------------------------------------------------------------- |
| `random/` | Zufallsquelle mit Startwert und Auswahlfunktionen.             |
| `font/`   | Die Schrift: Wege der Zeichen.                                 |
| `text/`   | Text aufbereiten, Trennstellen, Silbentrennung, Zeilenumbruch. |

## lists.ts

| Funktion              | Was sie konkret tut                                                                                                        |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `itemAt(list, index)` | Liefert das Element an der Stelle. Wirft einen `RangeError`, wenn es die Stelle nicht gibt (statt `undefined` zu liefern). |
| `lastOf(list)`        | Liefert das letzte Element. Wirft bei einer leeren Liste.                                                                  |
