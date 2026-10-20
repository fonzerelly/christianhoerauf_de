# tests

Tests, die mehrere Teile des Codes zusammen prüfen. Die Unit-Tests der einzelnen Klassen liegen
neben dem Code unter `src/`.

| Ordner / Datei   | Was sie prüft                                                                                      |
| ---------------- | -------------------------------------------------------------------------------------------------- |
| `golden-master/` | Der Neubau erzeugt bei gleichen Eingaben dasselbe wie der Prototyp.                                |
| `structure/`     | Labyrinth-Seiten von außen: Der Leser liest den Text aus der Route, die Route hält die Regeln ein. |

## golden-master

Der Prototyp (`prototyp/06-frage-antwort`) besteht aus schlichten Browser-Skripten. `prototype.ts`
lädt sie nacheinander in einen eigenen `vm`-Kontext, so wie der Browser sie lädt, und holt
Ergebnisse als JSON heraus.

| Datei                   | Was sie tut                                                                                                |
| ----------------------- | ---------------------------------------------------------------------------------------------------------- |
| `prototype.ts`          | `loadPrototype()`: `evaluate(code)` und `call(name, ...args)` führen Code des Prototyps aus.               |
| `maze-pages.ts`         | Erzeugt Seiten mit dem Prototyp und mit dem Neubau und bringt beide in dieselbe Form.                      |
| `text.test.ts`          | Glyphen, Aufbereitung, Silbentrennung und Zeilenumbruch gleich wie im Prototyp (Zeilenbreiten 1 bis 40).   |
| `maze.test.ts`          | Wände, Route, Eingang, Ausgang und Zeilen gleich, für mehrere Startwerte, Raster, Texte und Einstellungen. |
| `maze.property.test.ts` | Dasselbe für zufällige Startwerte, Raster, Texte und Einstellungen (`npm run test:properties`).            |

Nicht verglichen werden das Zeichen `!` und die Ersatzglyphe; der Prototyp kennt sie nicht. Für alle Texte ohne sie bleibt der Vergleich bitgleich.

## structure

| Datei                        | Was sie tut                                                                                                                                                                                                                                                                                                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `route-reader.ts`            | `readGlyphs`: liest aus der Route, welche Schrift der Lichtpunkt schreibt (Schriftwege und Punkte), und nennt je Feld die passenden Zeichen. Zeichen mit gleichem Bild (0/O, 5/S, 2/Z) kommen zusammen. Wirft, wenn außerhalb der Glyphen-Felder geschrieben wird. `glyphFieldsOf` liefert die Felder (`left`, `top`, `width`): 3 Zellen breit, die Ersatzglyphe 7. |
| `route-checks.ts`            | `checkRoute`: lückenlos, nie durch eine Wand, nur die ersten und letzten zwei Wegstücke außerhalb des Rasters, Anfang am Eingang und Ende am Ausgang, keine Kreuzung außerhalb des Textblocks, jede Zelle vom Eingang erreichbar. `checkPageSequence`: jeder Eingang liegt dem vorigen Ausgang gegenüber.                                                           |
| `soundness.ts`               | `expectPageIsSound`: Route in Ordnung und Text zurücklesbar.                                                                                                                                                                                                                                                                                                        |
| `structure.test.ts`          | Prüft jedes Zeichen einzeln und mehrere Sätze über alle Seiten.                                                                                                                                                                                                                                                                                                     |
| `structure.property.test.ts` | Dasselbe für zufällige Startwerte, Raster und Antworten, dazu der Haltepunkt im Raster.                                                                                                                                                                                                                                                                             |
| `svg-diagram.ts`             | `renderSvg`: zeichnet eine Seite als SVG (Wände dünn, Route rot).                                                                                                                                                                                                                                                                                                   |
| `schaubilder.test.ts`        | Schreibt je Zeichen und für einige Sätze ein SVG als Datei-Snapshot nach `schaubilder/`, dazu die Übersichtsseite `schaubilder/index.html`. Neue Fassung: `npm run test:unit -- -u`.                                                                                                                                                                                |

Kreuzungen im Textblock sind erlaubt: B, D und I kreuzen sich unten selbst (der Balken in der Mitte
schneidet die untere Linie), und ein Fragezeichen am Zeilenende kehrt auf der Grundlinie zu einer
Zelle zurück, die die Route schon gelaufen ist.
