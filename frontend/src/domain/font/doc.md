# domain/font

Die Schrift: Jedes Zeichen ist der Weg, den der Lichtpunkt in einem Feld von 3 × 5 Zellen
läuft, um es zu schreiben. Nur die Ersatzglyphe ist doppelt so breit (7 × 5 Zellen). Die Wege und ihre Regeln stehen als Kommentar in `glyph-data.ts`.

| Datei           | Was sie tut                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------- |
| `glyph.ts`      | Typen `Glyph`, `Waypoint`, `WaypointMarker` und die Maße des Felds.                         |
| `glyph-data.ts` | Die Wege aller Zeichen in Kurzschreibweise `[x, y]` bzw. `[x, y, Markierung]`.              |
| `font.ts`       | `Font`: ordnet Zeichen ihre Glyphe zu. `createDefaultFont()` liefert die Schrift der Seite. |
| `text-width.ts` | `widthInCharacters`, `glyphWidthOf`: Breiten in Zeichenbreiten bzw. Zellen.                 |

Darstellbar sind `A–Z`, `ÄÖÜ`, `0–9`, `-`, `.`, `?`, `!` und die Ersatzglyphe. Das Zeichen `█`
(`REPLACEMENT_CHARACTER`) steht im aufbereiteten Text für die Ersatzglyphe: ein Kamm. Der
Rücken steht rechts (Spalte 6), fünf Zinken zeigen nach links; jede läuft der Lichtpunkt als
Sackgasse hin und auf demselben Weg zurück, Ein- und Ausstieg unten rechts. Der Kamm belegt
7 × 5 Zellen, so viel wie zwei Zeichen samt Lücke.

## Font

| Methode               | Was sie konkret tut                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------- |
| `constructor(paths)`  | Wandelt die Wege in Kurzschreibweise in Glyphen mit benannten Feldern (`x`, `y`, `marker`).       |
| `hasGlyph(character)` | Sagt, ob die Schrift das Zeichen darstellen kann.                                                 |
| `glyphFor(character)` | Liefert die Glyphe des Zeichens, oder `undefined` für Zeichen ohne Glyphe (etwa das Leerzeichen). |

## createDefaultFont

Baut eine `Font` aus `GLYPH_PATHS`, den Wegen der Seite.

## text-width

Zeilenumbruch, Textkapazität und Textblock messen Text in **Zeichenbreiten**, nicht in Zeichen:
Die Ersatzglyphe ist so breit wie zwei Zeichen samt der Lücke dazwischen.

| Funktion                    | Was sie konkret tut                                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `widthInCharacters(text)`   | Summe der Zeichenbreiten: jedes Zeichen zählt 1, die Ersatzglyphe `█` zählt 2. Ein leerer Text hat die Breite 0.          |
| `glyphWidthOf(character)`   | Breite des Glyphen-Felds in Zellen: Zeichenbreiten mal 4 (Zeichen plus Lücke) minus 1. Also 3 für gewöhnliche, 7 für `█`. |
| `widthOfCharacter` (privat) | Zeichenbreiten eines Zeichens: 2 für die Ersatzglyphe, sonst 1.                                                           |
