# domain/pages

Aus Zeilen werden Labyrinth-Seiten, aus einer Antwort die Folge ihrer Seiten.

| Datei                    | Was sie tut                                                              |
| ------------------------ | ------------------------------------------------------------------------ |
| `text-capacity.ts`       | Wie viel Text auf eine Seite passt.                                      |
| `maze-page-generator.ts` | `MazePageGenerator`: erzeugt eine Labyrinth-Seite (`MazePage`).          |
| `answer-paginator.ts`    | `AnswerPaginator`: erzeugt alle Seiten einer Antwort und den Haltepunkt. |

## textCapacityOf

`textCapacityOf(columns, rows, returnBandRows)` rechnet: Von den Spalten gehen auf beiden Seiten
je 3 ab (Zeilenwechsel, Tor, Luft zum Rand), von den Zeilen oben und unten je 2. In die Breite
passt `(Spalten + 1) / 4` Zeichen, in die Höhe `(Zeilen + Band) / Zeilenabstand` Zeilen, jeweils
abgerundet und mindestens 1.

## MazePageGenerator

| Methode                                              | Was sie konkret tut                                                                                                                                                                                                             |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `constructor(columns, rows, random, font, settings)` | Baut aus der einen Zufallsquelle alle Bausteine (Grower, Wegsuche, Routenbauer, Wand-Unterbrecher).                                                                                                                             |
| `generate(lines, entrance)`                          | Wählt den Ausgang, legt den Textblock fest, baut die Route, bricht sie im Raster frei, unterbricht lange Wände und lässt alle übrigen Gänge um die Route wachsen. Führt `generateInSteps` ohne Pause aus.                       |
| `generateInSteps(lines, entrance)`                   | Dasselbe in Stücken (`Steps`): pausiert nach dem Bauen der Route und nach dem Freibrechen samt Unterbrechen der Wände; das Wachsen ist das letzte Stück. Die Reihenfolge der Zufallszüge ist dieselbe, die Seite ist bitgleich. |
| `carveRoute` (privat)                                | Bricht zwischen je zwei aufeinanderfolgenden Wegstücken im Raster die Wand heraus. Schritte außerhalb des Rasters haben keine Wände.                                                                                            |

`MazeSettings` sammelt die Werte des Labyrinths: `windiness`, `detour`, `returnBandRows`,
`returnWindiness`, `maxWallRun`.

## AnswerPaginator

| Methode                                                 | Was sie konkret tut                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `constructor(font, normalizer, createRandom, settings)` | Nimmt die Bausteine. `createRandom` macht aus einem Startwert eine Zufallsquelle.                                                                                                                                                                                                                                                                                                  |
| `paginate(answer, seed, exitBefore?)`                   | Bereitet die Antwort auf, bricht sie um, teilt die Zeilen auf Seiten, und erzeugt jede Seite. Die erste Seite beginnt gegenüber `exitBefore` (falls vorhanden), sonst an einem gewürfelten Eingang; jede Folgeseite gegenüber dem Ausgang der vorigen. Der Haltepunkt (`restingStepIndex`) liegt `restingDistance` Wegstücke hinter dem Ende der letzten Glyphe der letzten Seite. |
| `paginateInSteps(answer, seed, exitBefore?)`            | Dasselbe in Stücken (`Steps`): pausiert zweimal je Seite (siehe `generateInSteps`). Das Ergebnis ist bitgleich; `paginate` führt es ohne Pause aus.                                                                                                                                                                                                                                |
| `restingStepOf(page)`                                   | Der Haltepunkt einer beliebigen Seite: `lastGlyphEnd + restingDistance`. Die Animation braucht ihn auch für Seiten mitten in einer Antwort, an denen die Antwort endet, wenn eine neue Frage kommt.                                                                                                                                                                                |
