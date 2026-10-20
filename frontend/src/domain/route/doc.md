# domain/route

Die Route des Lichtpunkts über eine Labyrinth-Seite: wo der Text liegt, wo der Lichtpunkt hinein
und hinaus läuft und wie er sich durch Anlauf, Text und Ablauf bewegt. Das Labyrinth wächst
danach um die Route herum.

| Datei                    | Was sie tut                                                                    |
| ------------------------ | ------------------------------------------------------------------------------ |
| `route-step.ts`          | `RouteStep` und `StepKind`: ein Wegstück der Route.                            |
| `route-trace.ts`         | `RouteTrace`: die Route während des Baus.                                      |
| `text-block-layout.ts`   | Lage und Maße des Textblocks.                                                  |
| `gate.ts`                | `Gate` (Eingang/Ausgang), Randzellen außerhalb, Eingang gegenüber dem Ausgang. |
| `border-cell-picker.ts`  | `BorderCellPicker`: wählt Eingang und Ausgang.                                 |
| `territories.ts`         | `Territories`: teilt die Zellen in Anlauf, Text und Ablauf.                    |
| `area-path-finder.ts`    | `AreaPathFinder`: gewundener Weg durch einen Teil des Rasters.                 |
| `glyph-route.ts`         | `appendGlyph`: hängt den Weg durch eine Glyphe an die Route.                   |
| `line-change-planner.ts` | `LineChangePlanner`: der Zeilenwechsel durch das Band.                         |
| `route-builder.ts`       | `RouteBuilder`: baut die ganze Route einer Seite.                              |
| `wall-breaker.ts`        | `WallBreaker`: unterbricht lange gerade Wände entlang der Route.               |

## RouteStep

Ein Wegstück hat Spalte `x`, Zeile `y` (Zellen vor dem Eingang und hinter dem Ausgang liegen
außerhalb des Rasters), eine Art (`letter`, `connector`, `silent`) und `isDot`.

## RouteTrace

| Methode / Eigenschaft     | Was sie konkret tut                                                                                             |
| ------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `steps`                   | Die bisherigen Wegstücke.                                                                                       |
| `end`                     | Die Zelle, auf der die Route steht. Wirft bei leerer Route.                                                     |
| `lastGlyphEnd`            | Index des Wegstücks, auf dem die zuletzt geschriebene Glyphe endet; `undefined`, solange keine geschrieben ist. |
| `addStep(position, kind)` | Hängt ein Wegstück an.                                                                                          |
| `walkTo(x, y, kind)`      | Läuft Zelle für Zelle geradeaus zum Ziel. Wirft, wenn das Ziel nicht in derselben Zeile oder Spalte liegt.      |
| `markEndAsDot()`          | Macht das letzte Wegstück zu einem Punkt.                                                                       |
| `markGlyphEnd()`          | Merkt das letzte Wegstück als Ende der zuletzt geschriebenen Glyphe.                                            |

## text-block-layout

| Funktion                                      | Was sie konkret tut                                                                                               |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `lineAdvanceOf(returnBandRows)`               | Rasterzeilen je Textzeile: 5 Glyphenzeilen, 1 Grundlinie und das Band.                                            |
| `lineWidthOf(line)`                           | Breite einer Zeile: 4 Zellen je Zeichenbreite (die Ersatzglyphe belegt zwei), minus die Lücke hinter der letzten. |
| `lineLeftOf(line, columns)`                   | Erste Spalte der Zeile, wenn sie mittig steht (abgerundet).                                                       |
| `layoutTextBlock(lines, columns, rows, band)` | Zentriert den Textblock aus allen Zeilen im Raster und liefert seine äußersten Zellen (`Rectangle`).              |

## gate

| Funktion                                  | Was sie konkret tut                                                                             |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `outwardOf(side)`                         | Die Richtung, die am Rand aus dem Raster hinausführt, z. B. `right` → `{ x: 1, y: 0 }`.         |
| `cellOutside(gate, distance)`             | Die Zelle `distance` Schritte außerhalb des Rasters vor der Randzelle des Tors.                 |
| `entranceOppositeOf(exit, columns, rows)` | Der Eingang der Folgeseite: gegenüberliegender Rand, gleiche Zeile bzw. Spalte wie der Ausgang. |

## BorderCellPicker

| Methode                             | Was sie konkret tut                                                                                                                                     |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pickFirstEntrance(columns, rows)`  | Wählt links, oben oder unten (oben/unten nur in der linken Hälfte) und eine Zelle am Rand.                                                              |
| `pickExit(entrance, columns, rows)` | Wählt rechts, oben oder unten, wobei Ränder ohne Platz rechts vom Eingang übergangen werden, und eine Zelle am Rand (oben/unten in der rechten Hälfte). |
| `pickBorderCell` (privat)           | Zieht immer Spalte und Zeile, auch wenn nur eine gebraucht wird (Reihenfolge wie im Prototyp).                                                          |
| `exitColumnRange` (privat)          | Die Spalten, in denen ein Ausgang oben/unten liegen darf; am Rand des Eingangs rechts von ihm.                                                          |

## Territories

| Methode                                       | Was sie konkret tut                                                                                      |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `constructor(block, columns, entrance, exit)` | Bestimmt die Trennspalten über und unter dem Text.                                                       |
| `isText(cell)`                                | Textblock plus je eine Spalte Rand.                                                                      |
| `isApproach(cell)` / `isLeave(cell)`          | Alle übrigen Zellen links bzw. rechts der Trennung.                                                      |
| `dividingColumn` (privat)                     | Mitte; weicht nach rechts aus, wenn der Eingang an diesem Rand liegt, nach links bei einem Ausgang dort. |

## AreaPathFinder

| Methode                                | Was sie konkret tut                                                                                                       |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `find(isAllowed, from, to, windiness)` | Legt ein Wegwerf-Raster an, belegt alle nicht erlaubten Stellen und lässt den `WindingPathFinder` darin einen Weg suchen. |

## appendGlyph

`appendGlyph(trace, glyph, left, top)` läuft die Wegpunkte der Glyphe ab. Der Aufstieg von der Grundlinie
zum ersten Wegpunkt ist ein Verbindungsweg. Der Weg zu einem Punkt oder Sprung-Wegpunkt und der
Weg von einem Punkt weg sind Sprünge ohne Leuchtspur, alles andere ist Schriftweg. Bei einem Punkt
bekommt das Wegstück `isDot`.

## LineChangePlanner

| Methode                                                                    | Was sie konkret tut                                                                                                                      |
| -------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `appendLineChange(trace, band, descentColumn, nextBaselineRow, windiness)` | Sucht im Band einen gewundenen Weg vom Zeilenende zur Abstiegsspalte, hängt ihn an und läuft dann in der Spalte zur nächsten Grundlinie. |

## RouteBuilder

| Methode                                        | Was sie konkret tut                                                                                                                                                                                                                                                                                                                    |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `build(lines, block, columns, entrance, exit)` | Sucht Anlauf und Ablauf in ihren Revieren, setzt die Route aus Außenschritten, Anlauf, Text, Ablauf und Außenschritten zusammen und liefert sie samt Index des Endes der letzten Glyphe. Wirft, wenn der Text keine Glyphe enthält.                                                                                                    |
| `appendTextRoute` (privat)                     | Läuft Zeile für Zeile: Zeilenwechsel (ab der zweiten Zeile), dann je Zeichen zur Glyphe auf der Grundlinie, durch sie hindurch und zurück auf die Grundlinie. Leerzeichen haben keine Glyphe. Die nächste Glyphe beginnt jeweils um die Breite des Zeichens (Ersatzglyphe: zwei Zeichenbreiten) weiter rechts. Zuletzt zum Tor rechts. |

## WallBreaker

| Methode                                           | Was sie konkret tut                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `breakUpLongWalls(grid, route, lineCount, block)` | Geht die Wand unter jeder Grundlinie und jedem Band ab. Eine Wand zählt, wenn auf einer ihrer Seiten die Route verläuft. Ist ein Stück länger als die gewürfelte Länge (`maxWallRun / 2` aufgerundet bis `maxWallRun`), wird dort ein Durchgang gebrochen und die Länge neu gewürfelt. Bei `maxWallRun` 0 passiert nichts. |
| `rowsOfBaselinesAndBands` (privat)                | Die zu prüfenden Zeilen: jede Grundlinie, außer unter der letzten Zeile auch das Band darunter.                                                                                                                                                                                                                            |
