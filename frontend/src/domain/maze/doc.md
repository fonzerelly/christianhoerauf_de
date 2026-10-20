# domain/maze

Das Labyrinth selbst, unabhängig vom Text: Zellen, Durchgänge, Wachsen lassen und Wege suchen.
Alles arbeitet gegen die Schnittstelle `CellGraph`. Ein anderes Raster bräuchte nur eine weitere
Umsetzung davon.

| Datei                    | Was sie tut                                                 |
| ------------------------ | ----------------------------------------------------------- |
| `position.ts`            | `Position`: Spalte `x` und Zeile `y`.                       |
| `cell-graph.ts`          | Schnittstelle `CellGraph`, dazu `CellId`.                   |
| `rectangular-grid.ts`    | `RectangularGrid`: Rechteckraster als `CellGraph`.          |
| `maze-grower.ts`         | `MazeGrower`: lässt Gänge wachsen (Growing Tree).           |
| `path-finder.ts`         | `PathFinder`: kürzester Weg durch die Gänge (Breitensuche). |
| `winding-path-finder.ts` | `WindingPathFinder`: erfindet einen gewundenen Weg.         |

## CellGraph

Jede Zelle ist zu Beginn zugemauert und unberührt. Eine Zelle gilt als berührt, sobald ein Durchgang
zu ihr gebrochen oder sie von Hand mit `touch` belegt wurde.

| Methode                      | Was sie konkret tut                                              |
| ---------------------------- | ---------------------------------------------------------------- |
| `neighboursOf(cell)`         | Die Nachbarn im Raster, ob mit oder ohne Durchgang.              |
| `isConnected(first, second)` | Gibt es zwischen den beiden benachbarten Zellen einen Durchgang? |
| `connect(first, second)`     | Bricht die Wand dazwischen heraus und berührt beide Zellen.      |
| `isTouched(cell)`            | Ist die Zelle berührt?                                           |
| `touch(cell)`                | Berührt die Zelle, ohne einen Durchgang zu brechen (belegt sie). |
| `touchedCells()`             | Alle berührten Zellen, nach Nummern geordnet.                    |

## RectangularGrid

Zellen sind zeilenweise von oben links nummeriert (`x + y * columns`). Durchgänge nach rechts und
nach unten stehen in zwei Listen (`Uint8Array`, 1 = offen); der Durchgang gehört der linken bzw. oberen
Zelle. Ebenso die Markierung „berührt“. Die Listen sind aus Leistungsgründen kein `Array<boolean>`:
Jede Wegsuche legt ein Wegwerf-Raster an, und ein `Uint8Array` ist sofort mit Nullen gefüllt.

| Methode                                | Was sie konkret tut                                                                                                                                                                            |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `constructor(columns, rows)`           | Legt ein Raster aus lauter zugemauerten, unberührten Zellen an.                                                                                                                                |
| `contains(x, y)`                       | Liegt die Stelle im Raster?                                                                                                                                                                    |
| `idOf(x, y)`                           | Die Nummer der Zelle an der Stelle. Wirft, wenn sie außerhalb liegt.                                                                                                                           |
| `positionOf(cell)`                     | Die Stelle der Zelle.                                                                                                                                                                          |
| `isOpenRight(x, y)`                    | Ist die Wand rechts neben der Zelle offen? (Für das Zeichnen der Wände.)                                                                                                                       |
| `isOpenDown(x, y)`                     | Ist die Wand unter der Zelle offen?                                                                                                                                                            |
| `neighboursOf(cell)`                   | Rechts, links, unten, oben, soweit im Raster (gerechnet mit Nummern, ohne Stellen anzulegen). Die Reihenfolge ist Teil des Golden Masters.                                                     |
| `isConnected(first, second)`           | Durchgang zwischen zwei Nachbarn? Für Zellen, die nicht nebeneinander liegen: `false`.                                                                                                         |
| `connect(first, second)`               | Setzt den Durchgang und berührt beide. Wirft, wenn die Zellen nicht nebeneinander liegen.                                                                                                      |
| `isTouched` / `touch` / `touchedCells` | Wie in `CellGraph`.                                                                                                                                                                            |
| `passageBetween` (privat)              | Findet für zwei Nachbarn die Liste (rechts oder unten) und den Eintrag, in dem ihr Durchgang steht. Rechnet mit dem Unterschied der Nummern; der Unterschied 1 gilt nur innerhalb einer Zeile. |
| `isSet` (Funktion)                     | Ist das Flag an der Stelle gesetzt? Wirft einen `RangeError`, wenn es die Stelle nicht gibt (wie `itemAt`).                                                                                    |

## MazeGrower

| Methode                              | Was sie konkret tut                                                                                                                                                                                                            |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `constructor(random)`                | Merkt sich die Zufallsquelle.                                                                                                                                                                                                  |
| `grow(graph, startCells, windiness)` | Mischt die Startzellen, wählt dann wiederholt eine aktive Zelle und bricht einen Gang in eine unberührte Nachbarzelle. Hat die Zelle keine unberührten Nachbarn mehr, scheidet sie aus. Endet, wenn keine aktive Zelle bleibt. |
| `pickActiveIndex` (privat)           | Mit Wahrscheinlichkeit `windiness` die zuletzt aktivierte Zelle (lange Gänge), sonst eine zufällige (Sackgassen).                                                                                                              |

## PathFinder

| Methode                 | Was sie konkret tut                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------- |
| `find(graph, from, to)` | Breitensuche durch die Durchgänge. Liefert die Zellen von `from` bis `to`. Wirft, wenn es keinen Weg gibt. |
| `walkBack` (privat)     | Geht von `to` über die gemerkten Vorgänger zurück bis `from` und dreht den Weg am Ende einmal um.          |

## WindingPathFinder

| Methode                              | Was sie konkret tut                                                                                                                                      |
| ------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `constructor(grower, pathFinder)`    | Nimmt die beiden Bausteine.                                                                                                                              |
| `find(scratch, from, to, windiness)` | Berührt `from`, lässt im Wegwerf-Labyrinth `scratch` Gänge wachsen und sucht darin den einzigen Weg nach `to`. Vorher berührte Zellen gelten als belegt. |
