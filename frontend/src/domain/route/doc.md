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

| Funktion                                                  | Was sie konkret tut                                                                                                                                                                                        |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lineAdvanceOf(returnBandRows)`                           | Rasterzeilen je Textzeile: 5 Glyphenzeilen, 1 Grundlinie und das Band.                                                                                                                                     |
| `lineWidthOf(line)`                                       | Breite einer Zeile: 4 Zellen je Zeichenbreite (die Ersatzglyphe belegt zwei), minus die Lücke hinter der letzten.                                                                                          |
| `lineLeftIn(block, line, alignment)`                      | Erste Spalte der Zeile im Block: bündig links, bündig rechts oder mittig (abgerundet).                                                                                                                     |
| `layoutTextBlock(lines, columns, rows, band, alignment?)` | Textblock aus allen Zeilen: senkrecht mittig; waagrecht mittig, oder links/rechts mit 8 % der Breite Abstand zum Rand (mindestens 4 Spalten, nie näher als 3). Liefert die äußersten Zellen (`Rectangle`). |

## gate

| Funktion                                  | Was sie konkret tut                                                                                                                                                                                                                                                                                      |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `outwardOf(side)`                         | Die Richtung, die am Rand aus dem Raster hinausführt, z. B. `right` → `{ x: 1, y: 0 }`.                                                                                                                                                                                                                  |
| `cellOutside(gate, distance)`             | Die Zelle `distance` Schritte außerhalb des Rasters vor der Randzelle des Tors.                                                                                                                                                                                                                          |
| `entranceOppositeOf(exit, columns, rows)` | Der Eingang der Folgeseite: gegenüberliegender Rand, gleiche Zeile bzw. Spalte wie der Ausgang.                                                                                                                                                                                                          |
| `gateInGrid(gate, from, to)`              | Rechnet ein Tor von einem Raster in ein anderes auf derselben Fläche um: Seite bleibt, die Lage am Rand wird anteilig übertragen (Mitte der Zelle, abgerundet, höchstens die letzte Zelle). Beispiel: rechts auf Reihe 12 von 15 → rechts auf Reihe 18 von 22. Für Seiten im feineren Raster (Gimmicks). |

## Ein- und Ausgang

Seit Schritt 12.13 laufen alle Seiten gerade (ADR 0007): links herein, rechts hinaus, auf Höhe der
Schrift bzw. der untersten Reihe eines Gimmicks; ohne vorige Seite liegt der Eingang links. Der
frühere `BorderCellPicker` (zufällige Ränder wie in Prototyp 6) ist entfallen;
`MazePageGenerator` setzt die Tore selbst.

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

`buildPath(entrance, exit)` (seit Schritt 12.5): für eine Antwort ohne Stichwort ein gewundener
Weg durch das ganze Raster vom Eingang zum Ausgang, nur Verbindungswege, mit je zwei Schritten
außerhalb; `lastGlyphEnd` ist die Ausgangszelle.

| Methode                                                     | Was sie konkret tut                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `build(lines, block, columns, entrance, exit, alignment?)`  | Sucht Anlauf und Ablauf in ihren Revieren, setzt die Route aus Außenschritten, Anlauf, Text, Ablauf und Außenschritten zusammen und liefert sie samt Index des Endes der letzten Glyphe. Wirft, wenn der Text keine Glyphe enthält.                                                                                                                                                                                                                            | Die Zeilen stehen im Block nach `alignment`. |
| `buildPicture(picture, left, top, columns, entrance, exit)` | Wie `build`, aber statt des Texts ein Bild, dessen Feld bei (`left`, `top`) beginnt. Zum Bild gehören `ROWS_BELOW_PICTURE` (3) Zeilen darunter: In der untersten kommt der Lichtpunkt von links bis unter den Anfang des Bilds und steigt senkrecht hinauf (er kommt also von unten an die Spitze bzw. ans Kinn), zeichnet das Bild mit Schriftwegen, geht eine Zelle hinunter und in dieser Zeile rechts hinaus zum Ablauf.                                   |
| `buildPhoto(frame, laps, columns, entrance, exit)`          | Wie `build`, aber der Lichtpunkt umrundet ein Foto: `frame` ist der Ring von Zellen direkt ums Foto. Er kommt von links in der untersten Zeile des Rahmens an, läuft `laps`-mal herum (hinauf, nach rechts, hinunter, zurück nach links), mit Schriftwegen, und dann unten am Rahmen entlang rechts hinaus. Liefert dazu `lapEnds`: das Wegstück, auf dem jede Runde endet. Das Ende der letzten Runde ist das Ende der letzten „Glyphe“ (für den Haltepunkt). |
| `assemble` (privat)                                         | Gemeinsamer Teil von `build`, `buildPicture` und `buildPhoto`: legt die Reviere um den Block, sucht Anlauf (vom Eingang zum Tor links) und Ablauf (vom Tor rechts zum Ausgang), in dieser Reihenfolge der Zufallszüge, und setzt Außenschritte, Anlauf, Mitte (`appendMiddle`), Ablauf und Außenschritte zusammen. Wirft, wenn die Mitte keine Glyphe markiert hat.                                                                                            |
| `appendTextRoute` (privat)                                  | Läuft Zeile für Zeile: Zeilenwechsel (ab der zweiten Zeile), dann je Zeichen zur Glyphe auf der Grundlinie, durch sie hindurch und zurück auf die Grundlinie. Leerzeichen haben keine Glyphe. Die nächste Glyphe beginnt jeweils um die Breite des Zeichens (Ersatzglyphe: zwei Zeichenbreiten) weiter rechts. Zuletzt zum Tor rechts.                                                                                                                         |

## WallBreaker

| Methode                                           | Was sie konkret tut                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `breakUpLongWalls(grid, route, lineCount, block)` | Geht die Wand unter jeder Grundlinie und jedem Band ab. Eine Wand zählt, wenn auf einer ihrer Seiten die Route verläuft. Ist ein Stück länger als die gewürfelte Länge (`maxWallRun / 2` aufgerundet bis `maxWallRun`), wird dort ein Durchgang gebrochen und die Länge neu gewürfelt. Bei `maxWallRun` 0 passiert nichts. |
| `rowsOfBaselinesAndBands` (privat)                | Die zu prüfenden Zeilen: jede Grundlinie, außer unter der letzten Zeile auch das Band darunter.                                                                                                                                                                                                                            |
