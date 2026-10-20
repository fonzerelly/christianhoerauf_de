# rendering

Zeichnen. Dieser Ordner liest den Zustand der Animation (`PlaybackView` aus `animation/`) und malt
ihn auf ein Canvas. Das Canvas selbst steckt hinter dem schmalen `DrawingContext`; im Test steht
eine Attrappe dafür, die jeden Aufruf aufzeichnet (`test-support/recording-context.ts`).

| Datei                  | Was sie tut                                                                  |
| ---------------------- | ---------------------------------------------------------------------------- |
| `renderer.ts`          | Port `Renderer`: `resize`, `draw`, `discardPreparedImages`, `isGlitching`.   |
| `canvas-renderer.ts`   | `CanvasRenderer`: der Adapter, der alles zu einem Bild zusammensetzt.        |
| `drawing-context.ts`   | `DrawingContext`, `Layer`, `LayerFactory`, `CanvasSurface`: Zeichenwerkzeug. |
| `render-settings.ts`   | `RenderSettings`: Farben, Wände, Leuchtspur, Monitor.                        |
| `stage-layout.ts`      | `StageLayout`, `layoutStage`, `cellCenterOn`: Einteilung der Bühne.          |
| `scroll-shifts.ts`     | `scrollShiftsOf`: Verschiebung beider Seiten beim Weiterschieben.            |
| `wall-layer.ts`        | `WallLayer`, `traceWalls`: Wände vorab gezeichnet, mit Lichthof.             |
| `trail-painter.ts`     | `TrailPainter`: Leuchtspur nach Helligkeitsstufen gebündelt.                 |
| `dot-painter.ts`       | `DotPainter`: Lichtpunkt, am Haltepunkt pulsierend.                          |
| `monitor-effects.ts`   | `MonitorEffects`: Glasscheibe, Flimmern, Bildstörung.                        |
| `glitch-scheduler.ts`  | `GlitchScheduler`: würfelt, wann eine Bildstörung beginnt.                   |
| `motion-preference.ts` | Port `MotionPreference` und `MediaQueryMotionPreference`.                    |
| `test-settings.ts`     | Einfache Zahlen für die Tests des Zeichnens (kein Produktionscode).          |

## Reihenfolge eines Bildes

Maßstab setzen → Hintergrund füllen → alte Seite (Wände, beschnitten auf das Labyrinth: Leuchtspur
und Lichtpunkt) → beim Weiterschieben die neue Seite (nur Wände) → Bildstörung → Flimmern →
Glasscheibe.

Bei weniger Bewegung (`prefers-reduced-motion`) entfallen Flimmern und Bildstörung; der Lichtpunkt
leuchtet am Haltepunkt ruhig statt zu pulsieren.

## layoutStage, cellCenterOn

| Funktion                                                     | Was sie konkret tut                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `layoutStage(view, devicePixelRatio, maxPixelRatio, sizing)` | Pixeldichte = Gerät, höchstens `maxPixelRatio`. Feste Spaltenzahl (`{ columns }`): Zellgröße = Breite mal Dichte durch Spalten, abgerundet auf ganze Geräte-Pixel, geteilt durch die Dichte. Feste Zellgröße (`{ cellSize }`): Spalten = Breite durch Zelle. Zeilen = Höhe durch Zelle. Mindestens 10 × 10. Der Rand zentriert das Raster. |
| `cellCenterOn(layout, cell)`                                 | Mittelpunkt einer Zelle auf der Bühne, auch für Stellen zwischen zwei Zellen.                                                                                                                                                                                                                                                              |

## scrollShiftsOf

`scrollShiftsOf(exitSide, columns, rows, cellSize, part)`: Das Bild schiebt in die Richtung weiter,
in die der Lichtpunkt hinausgelaufen ist. Die alte Seite (`outgoing`) wandert entgegengesetzt hinaus,
die neue (`incoming`) rückt von dort herein; beide liegen eine Rasterbreite bzw. -höhe auseinander.
Auf ganze Pixel gerundet, damit die Wände nicht flimmern.

## WallLayer

| Methode                                 | Was sie konkret tut                                                                                                                                                                                                                 |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `traceWalls(context, page, cellSize)`   | Legt alle Wände einer Seite als Linien in den Pfad; Lücken an Eingang und Ausgang.                                                                                                                                                  |
| `imageOf(page, layout, settings)`       | Das Wandbild der Seite. Es entsteht beim ersten Mal auf einer eigenen Fläche in drei Schichten (Lichthof zweimal, Linie, heller Kern) und wird aufgehoben, bis sich Wandstärke, Farbe, Lichthof, Zellgröße oder Pixeldichte ändern. |
| `draw(context, page, layout, settings)` | Kopiert das Wandbild so aufs Bild, dass das Labyrinth an seinem Platz steht (Rand für den Lichthof eingerechnet).                                                                                                                   |
| `keepOnly(pages)`                       | Wirft die Wandbilder aller anderen Seiten weg.                                                                                                                                                                                      |
| `clear()`                               | Wirft alle Wandbilder weg.                                                                                                                                                                                                          |
| `render` (privat)                       | Legt die Fläche an (Größe des Labyrinths plus Rand, mal Pixeldichte) und zeichnet die drei Schichten.                                                                                                                               |

## TrailPainter

`draw(context, view, page, layout, settings)`: Von der Route betrachtet es nur den Teil, der noch
leuchtet (`firstGlowingStep` bis zum Wegstück, das der Lichtpunkt gerade läuft). Zuerst die blassen
Verbindungswege (Deckkraft = Stufe mal `connectorOpacity`), dann mit Leuchten die Schriftwege und
Punkte, jeweils Stufe für Stufe in einem Rutsch. Sprünge hinterlassen nichts.

| Methode                   | Was sie konkret tut                                                                                                                                                                                                                      |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `strokeSegments` (privat) | Zeichnet Wegstücke einer Art und Stufe, jedes um eine halbe Spurbreite gegen die Laufrichtung versetzt (stumpfe Enden), damit sie lückenlos und ohne Überlappung anschließen. Das laufende Wegstück endet an der Stelle des Lichtpunkts. |
| `fillDots` (privat)       | Zeichnet die schon besuchten Punkte einer Stufe als Kreise (Radius 0,8 Spurbreiten).                                                                                                                                                     |

## DotPainter

`draw(context, view, layout, settings, motion)`: Ein Kreis mit Radius 0,3 Zellen und radialem Farbverlauf
(innen weiß, außen `dotColor`), mit Leuchten von einer Zelle Breite. Am Haltepunkt (`isResting`) wächst
und schrumpft er mit `restingPulse` zwischen halber und voller Größe; bei `motion.isReduced` bleibt er
voll groß. Zeichnet nichts, wenn der Lichtpunkt nicht zu sehen ist.

## GlitchScheduler

| Methode                                                       | Was sie konkret tut                                                                                                                                                                                                      |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `advance(seconds, isAnimationRunning, perMinute, viewHeight)` | Läuft eine Störung, rückt sie vor oder endet. Sonst beginnt mit der Wahrscheinlichkeit `perMinute / 60 * seconds` eine neue, nur solange die Animation läuft: Dauer 0,35 bis 0,85 s, Balkenhöhe 8 bis 25 % der Bildhöhe. |
| `current`                                                     | Die laufende Störung (`part` 0 bis 1, `bandHeight`) oder `undefined`.                                                                                                                                                    |
| `stop()`                                                      | Beendet die laufende Störung.                                                                                                                                                                                            |

## MonitorEffects

| Methode                                    | Was sie konkret tut                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `drawOverlay(context, layout, settings)`   | Legt die Glasscheibe über das Bild: jede dritte Bildzeile abgedunkelt, dazu ein Farbverlauf zu dunklen Ecken. Vorab gezeichnet, neu nur bei anderer Größe, anderem Zeilenraster oder anderen Ecken.                                                                                                                                                                                                                                            |
| `drawFlicker(context, layout, settings)`   | Dunkelt das Bild um einen Zufallswert bis zu einem Viertel der Flimmerstärke ab.                                                                                                                                                                                                                                                                                                                                                               |
| `drawGlitch(context, canvas, glitch, ...)` | Kopiert die Zeilen des Störbalkens (mit Rand) aus dem fertigen Bild auf eine eigene Fläche; im Störbalken werden schmale Streifen (2 bis 7 Pixel hoch) von dieser Kopie seitlich versetzt darübergelegt, dazu ein heller Schleier (addierend) und 12 Rausch-Striche. Die Kopie ist nötig: Ein Canvas auf sich selbst zu zeichnen, kostete je Streifen eine Kopie des ganzen Canvas (216 ms je Bild auf einem gedrosselten Handy, jetzt 32 ms). |
| `discardPreparedImages()`                  | Wirft die vorab gezeichnete Glasscheibe und die Kopie für Bildstörungen weg.                                                                                                                                                                                                                                                                                                                                                                   |

## CanvasRenderer

| Methode                           | Was sie konkret tut                                                                                                                                                                                                           |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `constructor(parts)`              | Nimmt Canvas, Zeichenwerkzeug, Flächen-Fabrik, Zufall, Bewegungswunsch, Einstellungen und die erste Einteilung der Bühne.                                                                                                     |
| `resize(layout)`                  | Setzt Anzeigegröße und Auflösung des Canvas, wirft alles Vorgezeichnete weg und beendet eine Störung.                                                                                                                         |
| `draw(view, seconds)`             | Ein Bild (Reihenfolge siehe oben). Setzt den Maßstab vor jedem Bild neu, weil der Browser den Zeichenzustand jederzeit vergessen darf. Zeichnet die Wände der nächsten Seite schon vorab und wirft nicht mehr gebrauchte weg. |
| `discardPreparedImages()`         | Wirft Wände und Glasscheibe weg (Seite kommt aus dem Hintergrund zurück, `contextrestored`).                                                                                                                                  |
| `isGlitching`                     | Läuft eine Störung? Dann muss weitergezeichnet werden, auch wenn die Animation steht.                                                                                                                                         |
| `drawPages` / `drawPage` (privat) | Zeichnen die aktuelle Seite (mit Spur und Lichtpunkt, beschnitten auf die Labyrinth-Fläche) und die Folgeseite beim Weiterschieben, um die berechnete Verschiebung versetzt.                                                  |

## test-support für dieses Verzeichnis

`recording-context.ts` (zeichnet jeden Aufruf als Text auf), `fake-layers.ts` (Flächen, die aufzeichnen),
`maze-page-builder.ts` (kleine Seiten), `fake-playback-view.ts` (Zustand der Animation von Hand).
