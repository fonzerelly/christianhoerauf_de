# domain/font

Die Schrift: Jedes Zeichen ist der Weg, den der Lichtpunkt in einem Feld von 3 × 5 Zellen
läuft, um es zu schreiben. Die Wege und ihre Regeln stehen als Kommentar in `glyph-data.ts`.

| Datei           | Was sie tut                                                                                 |
| --------------- | ------------------------------------------------------------------------------------------- |
| `glyph.ts`      | Typen `Glyph`, `Waypoint`, `WaypointMarker` und die Maße des Felds.                         |
| `glyph-data.ts` | Die Wege aller Zeichen in Kurzschreibweise `[x, y]` bzw. `[x, y, Markierung]`.              |
| `font.ts`       | `Font`: ordnet Zeichen ihre Glyphe zu. `createDefaultFont()` liefert die Schrift der Seite. |

Darstellbar sind `A–Z`, `ÄÖÜ`, `0–9`, `-`, `.`, `?`, `!` und die Ersatzglyphe. Das Zeichen `█`
(`REPLACEMENT_CHARACTER`) steht im aufbereiteten Text für die Ersatzglyphe: ein Weg in
Schlangenlinien durch alle 15 Zellen.

## Font

| Methode               | Was sie konkret tut                                                                               |
| --------------------- | ------------------------------------------------------------------------------------------------- |
| `constructor(paths)`  | Wandelt die Wege in Kurzschreibweise in Glyphen mit benannten Feldern (`x`, `y`, `marker`).       |
| `hasGlyph(character)` | Sagt, ob die Schrift das Zeichen darstellen kann.                                                 |
| `glyphFor(character)` | Liefert die Glyphe des Zeichens, oder `undefined` für Zeichen ohne Glyphe (etwa das Leerzeichen). |

## createDefaultFont

Baut eine `Font` aus `GLYPH_PATHS`, den Wegen der Seite.
