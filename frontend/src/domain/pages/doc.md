# domain/pages

Aus Zeilen werden Labyrinth-Seiten, aus einer Antwort die Folge ihrer Seiten.

| Datei                    | Was sie tut                                                                                     |
| ------------------------ | ----------------------------------------------------------------------------------------------- |
| `text-capacity.ts`       | Wie viel Text auf eine Seite passt.                                                             |
| `maze-page-generator.ts` | `MazePageGenerator`: erzeugt eine Labyrinth-Seite (`MazePage`).                                 |
| `answer-paginator.ts`    | `AnswerPaginator`: erzeugt alle Seiten einer Antwort und den Haltepunkt.                        |
| `answer-content.ts`      | `AnswerContent`: Stichwort (`WrittenAnswer`), Bild (`PictureAnswer`) oder Foto (`PhotoAnswer`). |
| `picture-layout.ts`      | `placePicture`: wie groß ein Bild wird und wo es liegt.                                         |
| `photo-layout.ts`        | `placePhoto`: wie groß ein Foto wird und an welcher zufälligen Stelle es liegt.                 |

## textCapacityOf

`textCapacityOf(columns, rows, returnBandRows)` rechnet: Von den Spalten gehen auf beiden Seiten
je 3 ab (Zeilenwechsel, Tor, Luft zum Rand), von den Zeilen oben und unten je 2. In die Breite
passt `(Spalten + 1) / 4` Zeichen, in die Höhe `(Zeilen + Band) / Zeilenabstand` Zeilen, jeweils
abgerundet und mindestens 1.

## AnswerContent

Was der Lichtpunkt für eine Antwort schreibt (ADR 0007): ein Stichwort (`WrittenAnswer` mit
`keyword?` und `maxLinesPerPage`; ohne Stichwort nur einen Pfad; `\n` ist ein erzwungener
Umbruch), ein Bild (`PictureAnswer` mit `picture` und `keyword?`) oder ein Foto (`PhotoAnswer` mit
`photo` und `keyword?`; `PhotoName` ist bisher nur `"chris"`). Das Stichwort von Bild oder Foto
schreibt er, wenn sie nicht auf die Seite passen. Den Antworttext sieht nur der Screenreader
(bis Schritt 12.7 der Antwortbereich kommt).

## Seite ohne Stichwort

`generatePath(entrance?)` / `generatePathInSteps(entrance?)`: Der Lichtpunkt zieht nur einen Pfad
in Windungen durch das ganze Raster (`RouteBuilder.buildPath`), links herein (ohne vorige Seite auf
halber Höhe), rechts hinaus auf derselben Höhe. Keine Zeilen; das Ende liegt am Ausgang, der
Haltepunkt danach außerhalb (der Lichtpunkt geht hinaus).

## placePicture

`placePicture(name, columns, rows)` macht das Bild so groß, wie es passt (seit Schritt 12.13, ADR
0007): die größte ungerade Breite, höchstens so breit wie das Raster ohne je 3 Spalten Rand, bei
der das Bild samt 3 Zeilen für An- und Ablauf und je einer freien Reihe darüber und darunter
(`GIMMICK_FREE_ROWS`) ins Raster passt. Es steht waagrecht und senkrecht mittig. Wäre es kleiner
als `SMALLEST_SIZE`, liefert es `undefined`. `rowsNeededForPicture(name)`: so viele Reihen braucht
die kleinste Größe (Herz 15, Smiley 22).

## placePhoto

`placePhoto(photo, columns, rows, random)` macht das Foto quadratisch und so groß, wie es samt
Rahmen (1 Zelle), 3 freien Spalten und 1 freien Reihe ringsum passt. Unter 6 Zellen gibt es kein
Foto (`undefined`), und es wird nichts gezogen. Sonst zieht es die Spalte; senkrecht liegt es
mittig. `ROWS_NEEDED_FOR_PHOTO` (10): so viele Reihen braucht das kleinste Foto.

## MazePageGenerator

| Methode                                              | Was sie konkret tut                                                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `constructor(columns, rows, random, font, settings)` | Baut aus der einen Zufallsquelle alle Bausteine (Grower, Wegsuche, Routenbauer, Wand-Unterbrecher).                                                                                                                                                                                                                                                                                        |
| `generate(lines, entrance?, alignment?)`             | Legt den Textblock fest (senkrecht mittig, waagrecht nach `alignment`: links, mittig, rechts), Eingang (gegeben, sonst links auf Höhe der ersten Grundlinie) und Ausgang (rechts auf Höhe der letzten Grundlinie, Laufrichtung „gerade“, ADR 0007), baut die Route, bricht sie frei, unterbricht lange Wände und lässt die übrigen Gänge wachsen. Die Seite trägt ihre Lage (`alignment`). |
| `generateInSteps(lines, entrance?, alignment?)`      | Dasselbe in Stücken (`Steps`): pausiert nach dem Bauen der Route und nach dem Freibrechen samt Unterbrechen der Wände; das Wachsen ist das letzte Stück. Die Reihenfolge der Zufallszüge ist dieselbe, die Seite ist bitgleich.                                                                                                                                                            |
| `generatePicture(placed, entrance)`                  | Eine Seite, auf der der Lichtpunkt statt eines Texts ein Bild zeichnet. Führt `generatePictureInSteps` ohne Pause aus.                                                                                                                                                                                                                                                                     |
| `generatePictureInSteps(placed, entrance)`           | Ausgang wählen, Route durch das Bild bauen (`buildPicture`), Pause, freibrechen, Pause, wachsen lassen. Lange Wände werden nicht unterbrochen (das gilt nur Texten). Die Seite hat keine Zeilen.                                                                                                                                                                                           |
| `generatePhoto(placed, entrance)`                    | Eine Seite, auf der ein Foto liegt, das der Lichtpunkt umrundet. Führt `generatePhotoInSteps` ohne Pause aus.                                                                                                                                                                                                                                                                              |
| `generatePhotoInSteps(placed, entrance)`             | Ausgang wählen, Route bauen, die dreimal (`PHOTO_LAPS`) um den Rahmen des Fotos läuft (`buildPhoto`), Pause, freibrechen und das Feld unter dem Foto zu einem Raum ohne Wände machen, Pause, wachsen lassen. Die Seite trägt das Foto (`photo`: Stelle, Größe und `lapEnds`).                                                                                                              |
| `openRoom` (privat)                                  | Öffnet alle Wände zwischen den Zellen unter dem Foto. Die Wände zum Rahmen bleiben stehen und bilden seinen inneren Rand; weil alle Zellen des Raums schon erschlossen sind, wächst kein Gang hinein.                                                                                                                                                                                      |
| `carveRoute` (privat)                                | Bricht zwischen je zwei aufeinanderfolgenden Wegstücken im Raster die Wand heraus. Schritte außerhalb des Rasters haben keine Wände.                                                                                                                                                                                                                                                       |

`MazeSettings` sammelt die Werte des Labyrinths: `windiness`, `detour`, `returnBandRows`,
`returnWindiness`, `maxWallRun`. `PagePhoto` ist ein `PlacedPhoto` mit `lapEnds`; die meisten
Seiten haben keins.

## AnswerPaginator

| Methode                                                                                                                                                                                                                               | Was sie konkret tut                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `constructor(font, normalizer, createRandom, settings)`                                                                                                                                                                               | Nimmt die Bausteine. `createRandom` macht aus einem Startwert eine Zufallsquelle.                                                                                                                                               |
| `paginate(answer, seed, exitBefore?)`                                                                                                                                                                                                 | Zieht zuerst die Lage des Worts (links, mittig, rechts) aus `seed`. Bild oder Foto: eine Seite, wenn es passt. Sonst das Stichwort: ohne Stichwort (oder nur Leerraum) eine Seite mit Pfad; mit Stichwort jeden Teil zwischen ` |
| `aufbereiten und umbrechen, je Seite höchstens`maxLinesPerPage`Zeilen (und nicht mehr, als passen). Die erste Seite beginnt gegenüber`exitBefore` (sonst links auf Höhe der Schrift), jede weitere gegenüber dem Ausgang der vorigen. |
| `paginateInSteps(answer, seed, exitBefore?)`                                                                                                                                                                                          | Dasselbe in Stücken (`Steps`): pausiert zweimal je Seite (siehe `generateInSteps`). Das Ergebnis ist bitgleich; `paginate` führt es ohne Pause aus.                                                                             |
| `restingStepOf(page)`                                                                                                                                                                                                                 | Der Haltepunkt einer beliebigen Seite: `lastGlyphEnd + restingDistance`. Die Animation braucht ihn auch für Seiten mitten in einer Antwort, an denen die Antwort endet, wenn eine neue Frage kommt.                             |
