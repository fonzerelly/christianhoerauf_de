# domain/pages

Aus Zeilen werden Labyrinth-Seiten, aus einer Antwort die Folge ihrer Seiten.

| Datei                    | Was sie tut                                                                     |
| ------------------------ | ------------------------------------------------------------------------------- |
| `text-capacity.ts`       | Wie viel Text auf eine Seite passt.                                             |
| `maze-page-generator.ts` | `MazePageGenerator`: erzeugt eine Labyrinth-Seite (`MazePage`).                 |
| `answer-paginator.ts`    | `AnswerPaginator`: erzeugt alle Seiten einer Antwort und den Haltepunkt.        |
| `answer-content.ts`      | `AnswerContent`: Text, Bild (`PictureAnswer`) oder Foto (`PhotoAnswer`).        |
| `picture-layout.ts`      | `placePicture`: wie groß ein Bild wird und wo es liegt.                         |
| `photo-layout.ts`        | `placePhoto`: wie groß ein Foto wird und an welcher zufälligen Stelle es liegt. |

## textCapacityOf

`textCapacityOf(columns, rows, returnBandRows)` rechnet: Von den Spalten gehen auf beiden Seiten
je 3 ab (Zeilenwechsel, Tor, Luft zum Rand), von den Zeilen oben und unten je 2. In die Breite
passt `(Spalten + 1) / 4` Zeichen, in die Höhe `(Zeilen + Band) / Zeilenabstand` Zeilen, jeweils
abgerundet und mindestens 1.

## AnswerContent

Was der Lichtpunkt für eine Antwort schreibt: ein Text (`string`), ein Bild (`PictureAnswer`
mit `picture` und `text`) oder ein Foto (`PhotoAnswer` mit `photo` und `text`; `PhotoName` ist
bisher nur `"chris"`). `text` schreibt er, wenn Bild oder Foto nicht auf die Seite passen; ihn
liest auch der Screenreader vor.

## placePicture

`placePicture(name, columns, rows)` macht das Bild etwa zwei Drittel so breit wie die kürzere
Seite des Rasters, abgerundet auf eine ungerade Zahl (damit es eine mittlere Spalte gibt), und
setzt es samt den 3 Zeilen für An- und Ablauf darunter in die Mitte. Wäre es kleiner als
`SMALLEST_SIZE`, liefert es `undefined`. Um das Bild bleibt dann immer so viel Rand wie um
einen Text.

## placePhoto

`placePhoto(photo, columns, rows, random)` macht das Foto quadratisch und zwei Fünftel so groß
wie die kürzere Seite des Rasters (abgerundet; am Desktop etwa 14 Zellen). Unter 6 Zellen gibt
es kein Foto (`undefined`), und es wird nichts gezogen. Sonst zieht es erst die Spalte, dann die
Zeile der linken oberen Zelle, so dass um den Rahmen (eine Zelle ums Foto) mindestens 3 Spalten
und 2 Zeilen frei bleiben.

## MazePageGenerator

| Methode                                              | Was sie konkret tut                                                                                                                                                                                                                                                           |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `constructor(columns, rows, random, font, settings)` | Baut aus der einen Zufallsquelle alle Bausteine (Grower, Wegsuche, Routenbauer, Wand-Unterbrecher).                                                                                                                                                                           |
| `generate(lines, entrance)`                          | Wählt den Ausgang, legt den Textblock fest, baut die Route, bricht sie im Raster frei, unterbricht lange Wände und lässt alle übrigen Gänge um die Route wachsen. Führt `generateInSteps` ohne Pause aus.                                                                     |
| `generateInSteps(lines, entrance)`                   | Dasselbe in Stücken (`Steps`): pausiert nach dem Bauen der Route und nach dem Freibrechen samt Unterbrechen der Wände; das Wachsen ist das letzte Stück. Die Reihenfolge der Zufallszüge ist dieselbe, die Seite ist bitgleich.                                               |
| `generatePicture(placed, entrance)`                  | Eine Seite, auf der der Lichtpunkt statt eines Texts ein Bild zeichnet. Führt `generatePictureInSteps` ohne Pause aus.                                                                                                                                                        |
| `generatePictureInSteps(placed, entrance)`           | Ausgang wählen, Route durch das Bild bauen (`buildPicture`), Pause, freibrechen, Pause, wachsen lassen. Lange Wände werden nicht unterbrochen (das gilt nur Texten). Die Seite hat keine Zeilen.                                                                              |
| `generatePhoto(placed, entrance)`                    | Eine Seite, auf der ein Foto liegt, das der Lichtpunkt umrundet. Führt `generatePhotoInSteps` ohne Pause aus.                                                                                                                                                                 |
| `generatePhotoInSteps(placed, entrance)`             | Ausgang wählen, Route bauen, die dreimal (`PHOTO_LAPS`) um den Rahmen des Fotos läuft (`buildPhoto`), Pause, freibrechen und das Feld unter dem Foto zu einem Raum ohne Wände machen, Pause, wachsen lassen. Die Seite trägt das Foto (`photo`: Stelle, Größe und `lapEnds`). |
| `openRoom` (privat)                                  | Öffnet alle Wände zwischen den Zellen unter dem Foto. Die Wände zum Rahmen bleiben stehen und bilden seinen inneren Rand; weil alle Zellen des Raums schon erschlossen sind, wächst kein Gang hinein.                                                                         |
| `carveRoute` (privat)                                | Bricht zwischen je zwei aufeinanderfolgenden Wegstücken im Raster die Wand heraus. Schritte außerhalb des Rasters haben keine Wände.                                                                                                                                          |

`MazeSettings` sammelt die Werte des Labyrinths: `windiness`, `detour`, `returnBandRows`,
`returnWindiness`, `maxWallRun`. `PagePhoto` ist ein `PlacedPhoto` mit `lapEnds`; die meisten
Seiten haben keins.

## AnswerPaginator

| Methode                                                 | Was sie konkret tut                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `constructor(font, normalizer, createRandom, settings)` | Nimmt die Bausteine. `createRandom` macht aus einem Startwert eine Zufallsquelle.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `paginate(answer, seed, exitBefore?)`                   | Bereitet die Antwort auf, bricht sie um, teilt die Zeilen auf Seiten, und erzeugt jede Seite. Die erste Seite beginnt gegenüber `exitBefore` (falls vorhanden), sonst an einem gewürfelten Eingang; jede Folgeseite gegenüber dem Ausgang der vorigen. Der Haltepunkt (`restingStepIndex`) liegt `restingDistance` Wegstücke hinter dem Ende der letzten Glyphe der letzten Seite. Ein Bild wird eine einzige Seite (`generatePictureInSteps`), ein Foto ebenso (`placePhoto` zieht erst die Stelle, dann wird der Eingang bestimmt, dann `generatePhotoInSteps`). Passen sie nicht, wird ihr `text` geschrieben. |
| `paginateInSteps(answer, seed, exitBefore?)`            | Dasselbe in Stücken (`Steps`): pausiert zweimal je Seite (siehe `generateInSteps`). Das Ergebnis ist bitgleich; `paginate` führt es ohne Pause aus.                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `restingStepOf(page)`                                   | Der Haltepunkt einer beliebigen Seite: `lastGlyphEnd + restingDistance`. Die Animation braucht ihn auch für Seiten mitten in einer Antwort, an denen die Antwort endet, wenn eine neue Frage kommt.                                                                                                                                                                                                                                                                                                                                                                                                               |
