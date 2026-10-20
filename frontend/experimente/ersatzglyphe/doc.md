# Experiment: Ersatzglyphe

Wie könnte die Ersatzglyphe aussehen, damit sie im Text nicht wie ein E wirkt? Vorgabe ist die
Skizze `docs/prototyp/ersatzglyphe.txt`: ein Kamm, dessen Zinken der Lichtpunkt als Sackgassen
erkundet, auf demselben Weg hin und zurück.

Aufruf: `experimente/ersatzglyphe/zeichne.sh`. Das Skript bündelt `zeichne.ts` mit rolldown und
führt es mit Node aus. Ergebnis: `bilder/index.html`.

Das Experiment ändert nichts an der Schrift unter `src/`. Es baut sich eine eigene `Font`, in der
nur die Ersatzglyphe ausgetauscht ist.

| Funktion      | Was sie konkret tut                                                                                                                      |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `combRight`   | Weg eines Kamms mit Rücken rechts: von unten rechts jede Zeile nach links und zurück, Zeile für Zeile nach oben, dann zurück nach unten. |
| `combCenter`  | Wie `combRight`, aber der Rücken steht in der Mitte und jede Zeile wird nach links und nach rechts erkundet.                             |
| `fontWith`    | Die Schrift der Seite, nur mit dem Weg der Variante als Ersatzglyphe.                                                                    |
| `mazePages`   | Erzeugt mit dem echten Generator die Seiten des Beispielsatzes, prüft jede Route mit `checkRoute` und liefert sie als SVG.               |
| `sketch`      | Zeichnet den Beispielsatz nur als Leuchtspur, ohne Labyrinth. Die Ersatzglyphe darf hier breiter sein und halbe Zellen nutzen.           |
| `glyphPoints` | Die Wegpunkte eines Zeichens aus `GLYPH_PATHS`, ohne Punkte (`dot`).                                                                     |
| `polyline`    | Ein Weg als SVG-`polyline`, verschoben an die Stelle des Zeichens.                                                                       |
| `figure`      | Ein Bild mit Bildunterschrift für die Übersichtsseite.                                                                                   |
| `main`        | Schreibt alle Bilder und die Übersichtsseite nach `bilder/`.                                                                             |
