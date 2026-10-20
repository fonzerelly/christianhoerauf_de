# domain/text

Aus einer Antwort werden Zeilen, die die Schrift darstellen kann: erst aufbereiten, dann bei
Wortgrenzen und markierten Trennstellen umbrechen.

| Datei                | Was sie tut                                                       |
| -------------------- | ----------------------------------------------------------------- |
| `break-marks.ts`     | Das Trennstellen-Zeichen `                                        | ` und zwei Funktionen, die damit umgehen. |
| `text-normalizer.ts` | `TextNormalizer`: macht aus beliebigem Text einen darstellbaren.  |
| `hyphenator.ts`      | `Hyphenator`: zerteilt ein zu langes Wort mit Trennstrich.        |
| `line-wrapper.ts`    | `LineWrapper`: bricht einen Text in Zeilen einer Höchstbreite um. |

## break-marks

| Funktion                  | Was sie konkret tut           |
| ------------------------- | ----------------------------- |
| `withoutBreakMarks(text)` | Entfernt alle `               | `: aus `PRO                                           | TO  | TYP`wird`PROTOTYP`.              |
| `readBreakMarks(word)`    | Liefert die Buchstaben ohne ` | `und die Stellen, vor denen getrennt werden darf:`PRO | TO  | TYP`ergibt`PROTOTYP`und`[3, 5]`. |

## TextNormalizer

| Methode                            | Was sie konkret tut                                                                                                                                                                                                                                                                                                                                        |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `constructor(font, reportUnknown)` | `font` bestimmt, was darstellbar ist. `reportUnknown` bekommt die unbekannten Zeichen (die Seite schreibt sie als Warnung in die Konsole).                                                                                                                                                                                                                 |
| `normalize(text)`                  | Zerlegt den Text in Grapheme (`graphemesOf`), bereitet jedes auf, setzt sie zusammen, fasst Leerzeichen zusammen und schneidet die Enden ab. Meldet unbekannte Zeichen einmal je Aufruf. Bleibt nichts Sichtbares übrig, liefert sie `?`.                                                                                                                  |
| `graphemesOf` (privat)             | Text nur aus druckbarem ASCII und den Buchstaben À bis ÿ: jedes Zeichen ist ein Graphem (`Array.from`), ohne `Intl.Segmenter`. Sonst zerlegt der `Intl.Segmenter`, der erst dann angelegt wird. Grund: Sein Anlegen kostet einige Millisekunden beim Start, und die Begrüßung braucht ihn nicht. Ein Property-Test prüft, dass beide Wege gleich zerlegen. |
| `normalizeGrapheme` (privat)       | Leerraum wird ein Leerzeichen, unsichtbare Steuerzeichen entfallen. `,` `;` `:` werden Leerzeichen. Sonst: Großschreibung (ß wird SS); ist das darstellbar, bleibt es. Sonst werden Akzente und angehängte unsichtbare Zeichen entfernt (É wird E); ist der Rest darstellbar, gilt er. Alles andere wird genau eine Ersatzglyphe.                          |
| `isDrawable` (privat)              | Prüft, ob jedes Zeichen eines Texts eine Glyphe hat.                                                                                                                                                                                                                                                                                                       |

## Hyphenator

| Methode                        | Was sie konkret tut                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `constructor(maxCharsPerLine)` | Merkt sich die Zeilenbreite (in Zeichenbreiten, die Ersatzglyphe zählt zwei).                                                                                                                                                                                                                                                                                                                                                                                          |
| `split(markedWord)`            | Zerteilt ein Wort, das nicht in eine Zeile passt, in Stücke mit Trennstrich. Getrennt wird an der spätesten Trennstelle, bei der das Stück samt Strich passt, sonst nach Platz. Ist die Zeile für zwei Buchstaben und einen Strich zu kurz, entfällt der Strich. Ein Wort, das passt, kommt als einziges Stück zurück. Breiten zählen in Zeichenbreiten: die Ersatzglyphe belegt zwei, steht sie allein breiter als die Zeile, bekommt sie trotzdem ein eigenes Stück. |

## LineWrapper

| Methode                          | Was sie konkret tut                                                                                                                                                                                                                          |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `constructor(maxCharsPerLine)`   | Merkt sich die Zeilenbreite und legt den `Hyphenator` dafür an.                                                                                                                                                                              |
| `wrap(text)`                     | Füllt Zeilen Wort für Wort (gemessen in Zeichenbreiten, die Ersatzglyphe zählt zwei). Ein Wort, das nicht in eine Zeile passt, wird mit dem `Hyphenator` zerteilt und beginnt eine neue Zeile. Die Zeilen enthalten keine Trennstellen mehr. |
| `avoidLonelyCharacters` (privat) | Steht in einer Zeile nur ein Zeichen (eine Zeichenbreite, die breite Ersatzglyphe allein zählt nicht), rutscht das letzte Wort der Zeile davor mit hinunter, wenn diese mehr als ein Wort hat und nicht auf `-` endet.                       |
