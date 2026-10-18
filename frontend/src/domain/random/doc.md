# domain/random

Zufall für den fachlichen Kern. Der Kern zieht Zufallszahlen nur über `RandomSource`, nie aus
`Math.random`. Dadurch ist ein Labyrinth aus seinem Startwert reproduzierbar.

Die Reihenfolge, in der Zufallszahlen gezogen werden, ist Teil des Vertrags: Sie entspricht der
des Prototyps (Golden Master). Jede Ziehung, die zusätzlich oder in anderer Reihenfolge
passiert, verändert alle folgenden Labyrinthe.

| Datei               | Was sie tut                                                    |
| ------------------- | -------------------------------------------------------------- |
| `random-source.ts`  | Schnittstelle `RandomSource`.                                  |
| `mulberry32.ts`     | `Mulberry32`: Umsetzung von `RandomSource` mit Startwert.      |
| `random-choices.ts` | Hilfsfunktionen, die aus einer `RandomSource` etwas auswählen. |

## RandomSource

| Methode  | Was sie konkret tut                                       |
| -------- | --------------------------------------------------------- |
| `next()` | Liefert die nächste Zahl, mindestens 0 und kleiner als 1. |

## Mulberry32

| Methode             | Was sie konkret tut                                                                                                                                              |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `constructor(seed)` | Merkt sich den Startwert als vorzeichenlose 32-Bit-Zahl. Gleicher Startwert ergibt dieselbe Zahlenfolge.                                                         |
| `next()`            | Schiebt den Zustand um eine feste Konstante weiter, mischt ihn mit Bit-Operationen und teilt durch 2³². Liefert dieselben Zahlen wie `createRandom` im Prototyp. |

## random-choices

| Funktion                           | Was sie konkret tut                                                                                                   |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `pickOne(list, random)`            | Zieht eine Zahl und liefert das Element an der Stelle `floor(Zahl × Länge)`.                                          |
| `integerBetween(min, max, random)` | Zieht eine Zahl und liefert eine ganze Zahl von `min` bis `max`, beide eingeschlossen.                                |
| `shuffle(list, random)`            | Mischt die Liste an Ort und Stelle (Fisher-Yates von hinten nach vorn, eine Ziehung je Position) und gibt sie zurück. |
