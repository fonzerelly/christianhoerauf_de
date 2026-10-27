# domain/picture

Die Bilder, die der Lichtpunkt statt eines Texts zeichnet (Gimmicks aus ADR 0003): das Herz für
einen Flirt und den Smiley mit der Hand vor dem Mund (🤭) für sexuelle Fragen. Ein Bild ist ein
Weg durch Zellen im selben Format wie eine Glyphe; die Route führt den Lichtpunkt hindurch.

| Datei                          | Was sie tut                                                        |
| ------------------------------ | ------------------------------------------------------------------ |
| `cells.ts`                     | Kurven und Linien in Wege durch benachbarte Zellen übersetzen.     |
| `heart.ts`                     | `heartPath`, `heartHeightOf`: der Umriss des Herzens.              |
| `face-with-hand-over-mouth.ts` | `faceWithHandOverMouth`: Gesicht, Hand und Augen als vier Striche. |
| `picture.ts`                   | `PictureName`, `Picture`, `SMALLEST_SIZE`, `drawPicture`.          |

## cells.ts

| Funktion                            | Was sie konkret tut                                                                                                                                                                                                                    |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `isSameCell(first, second)`         | Liegen beide Stellen in derselben Zelle (gleiches `x` und `y`)?                                                                                                                                                                        |
| `cellsOnLine(from, to)`             | Die Zellen auf der geraden Linie zwischen zwei Zellen, als Treppe durch Nachbarzellen (nie diagonal). Bei jedem Schritt geht es in die Richtung, die näher an der Linie bleibt; bei Gleichstand waagrecht. Anfang und Ende sind dabei. |
| `cellsOnCurve(points)`              | Macht aus dicht abgetasteten Punkten einer Kurve einen Weg durch Nachbarzellen: jeder Punkt wird auf seine Zelle abgerundet, doppelte fallen weg, Lücken füllt `cellsOnLine`. Zuletzt werden Zacken von einer Zelle entfernt.          |
| `closeByMirroring(leftHalf, width)` | Ergänzt einen Weg über die linke Hälfte eines Felds der Breite `width` um sein Spiegelbild rückwärts, sodass er dort endet, wo er begann. Die Zelle auf der Mittelachse kommt nur einmal vor; Zacken an der Naht werden entfernt.      |
| `withoutSingleCellSpikes` (privat)  | Entfernt aus A, B, A (ein Schritt hin und sofort zurück) das B und das zweite A, außer der Weg kehrt dort ohnehin um.                                                                                                                  |

## heart.ts

| Funktion               | Was sie konkret tut                                                                                                                                                                                                                                       |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `heartHeightOf(width)` | Wie viele Zeilen das Herz bei dieser Breite hat, im Seitenverhältnis der Herzkurve (gerundet).                                                                                                                                                            |
| `heartPath(width)`     | Der Umriss des Herzens (Kurve x = 16 sin³ t, y = 13 cos t − 5 cos 2t − 2 cos 3t − cos 4t), auf die Zellmitten des Felds abgebildet. Gerastert wird die linke Hälfte von der Spitze bis zur Kerbe, die rechte gespiegelt. Beginnt und endet an der Spitze. |
| `heartCurve` (privat)  | Ein Punkt der Herzkurve zum Winkel `t`.                                                                                                                                                                                                                   |

## face-with-hand-over-mouth.ts

| Funktion                                | Was sie konkret tut                                                                                                                                                                                                                                                                                   |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `faceWithHandOverMouth(size)`           | Vier Striche in einem Feld von `size` × `size` Zellen: das Gesicht (ein Kreis vom Kinn links herum zurück zum Kinn, rechte Hälfte gespiegelt), die Hand, das linke und das rechte Auge (lachende Bögen, nach oben gewölbt, spiegelgleich).                                                            |
| `hand` (privat)                         | Die Hand wächst aus dem Kinn: Handgelenk hinauf, links um die Handfläche (untere Ecken um eine Stufe abgerundet), vier Finger nebeneinander nach oben (verschieden lang, `FINGER_SHARES`), rechts ein kurzer Daumen, die Handfläche hinunter und zurück ins Kinn. Zu den Augen bleiben 2 Zeilen frei. |
| `arc` (privat)                          | Ein Bogen einer Ellipse als Weg durch Zellen (`cellsOnCurve`).                                                                                                                                                                                                                                        |
| `cellsThrough(start, corners)` (privat) | Die Zellen eines Wegs, der von `start` aus waagrecht und senkrecht von Eckpunkt zu Eckpunkt läuft.                                                                                                                                                                                                    |

## picture.ts

| Funktion / Typ            | Was sie konkret tut                                                                                                                                                                                                                                                        |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PictureName`             | `"heart"` oder `"face_with_hand_over_mouth"`.                                                                                                                                                                                                                              |
| `Picture`                 | Breite, Höhe und der Weg (`glyph`, Wegpunkte wie bei einer Glyphe). Der Weg beginnt und endet in der untersten Zeile.                                                                                                                                                      |
| `SMALLEST_SIZE`           | Kleinste Breite, bei der das Bild noch zu erkennen ist: Herz 11, Smiley 17.                                                                                                                                                                                                |
| `glyphOfStrokes(strokes)` | Macht aus Strichen einen Weg: jede Zelle ein Wegpunkt. Zwischen zwei Strichen, die nicht aneinander anschließen, springt der Lichtpunkt ohne Leuchtspur (Marker `hop`, erst waagrecht, dann senkrecht). Zuletzt springt er zurück an den Anfang. Leere Striche fallen weg. |
| `hop` (privat)            | Die Wegpunkte eines Sprungs: eine Ecke (falls sie nicht mit Anfang oder Ziel zusammenfällt) und das Ziel, beide mit Marker `hop`.                                                                                                                                          |
| `drawPicture(name, size)` | Das Bild in der Breite `size`: das Herz ist so hoch, wie `heartHeightOf` sagt, der Smiley quadratisch.                                                                                                                                                                     |
