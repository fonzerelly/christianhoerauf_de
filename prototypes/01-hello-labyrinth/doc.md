# Labyrinth-Prototyp „HELLO"

Wegwerf-Prototyp zur Frage: Ist eine Nachricht lesbar, wenn ein Lichtpunkt sie
als Weg durch ein Labyrinth schreibt?

Öffnen: `index.html` direkt im Browser (kein Server, kein Build nötig).

## Die Idee in drei Schritten

1. **Route bauen:** Aus dem Text wird der komplette Weg des Lichtpunkts berechnet,
   Zelle für Zelle – vom Eingang links durch alle Buchstaben zum Ausgang rechts.
2. **Route freibrechen:** Entlang dieses Wegs werden die Wände entfernt.
3. **Rest wachsen lassen:** Alle übrigen Zellen werden mit zufälligen Gängen
   gefüllt. Dabei wird nur in noch unberührte Zellen gegraben, es entsteht also
   keine Abkürzung – die Route bleibt der Lösungsweg.

Der Text bestimmt die Route, der Seed bestimmt das Füllmaterial.

## Aufbau einer Textzeile

```
5 Zeilen   Buchstaben (je 3 Zellen breit, 1 Zelle Abstand)
1 Zeile    Verbindungsspur: von Buchstabe zu Buchstabe
1 Zeile    Rückweg: nach links zum Anfang der nächsten Textzeile
```

Wegstücke in den Buchstaben sind als `isLetter` markiert und leuchten kräftig,
alle anderen (Spur, Rückweg) sind Verbinder und werden blass gezeichnet.

## schrift.js

| Name | Was es tut |
|---|---|
| `GLYPHS` | Pro Zeichen die Liste der Wegpunkte `[x, y]` im 3×5-Kästchen. Der Punkt läuft sie der Reihe nach geradlinig ab. Erster und letzter Wegpunkt liegen in der untersten Zeile. Doppelt gelaufene Stücke sind erlaubt. |
| `normalizeText(text)` | Wandelt die Eingabe in darstellbaren Text: Großbuchstaben, Ä/Ö/Ü/ß ausgeschrieben, unbekannte Zeichen entfernt, Mehrfach-Leerzeichen zusammengefasst. |
| `wrapText(text, maxCharsPerLine)` | Bricht an Wortgrenzen in Zeilen um. Zu lange Wörter werden hart zerteilt. |

## labyrinth.js

| Name | Was es tut |
|---|---|
| `createRandom(seed)` | Liefert einen Zufallsgenerator (Mulberry32), der bei gleichem Seed immer dieselbe Zahlenfolge erzeugt. |
| `pickRandom(list, random)` | Wählt ein zufälliges Element der Liste. |
| `createEmptyMaze(cols, rows)` | Legt ein Raster an, in dem jede Zelle rundum zugemauert ist. `openRight[y][x]` / `openDown[y][x]` merken sich Durchgänge, `visited[y][x]` ob die Zelle schon erschlossen ist. |
| `carvePassage(maze, from, to)` | Entfernt die Wand zwischen zwei Nachbarzellen und markiert beide als erschlossen. |
| `walkTo(route, x, y, isLetter)` | Verlängert die Route in gerader Linie bis zur Zielzelle, eine Zelle pro Schritt. |
| `buildRoute(lines, cols, rows)` | Baut die ganze Route: zentriert den Textblock, läuft pro Zeichen von der Verbindungsspur hoch in den Buchstaben, die Wegpunkte ab und wieder hinunter; zwischen zwei Zeilen über den Rückweg nach links. |
| `carveRoute(maze, route)` | Bricht entlang der Route alle Wände heraus. |
| `unvisitedNeighbours(maze, cell)` | Liefert die noch unberührten Nachbarzellen innerhalb des Rasters. |
| `shuffle(list, random)` | Mischt eine Liste (Fisher-Yates). |
| `growMaze(maze, random, windiness)` | „Growing Tree": wählt wiederholt eine erschlossene Zelle und gräbt von dort in einen unberührten Nachbarn. `windiness` nahe 1 nimmt meist die neueste Zelle (lange, gewundene Gänge), nahe 0 eine zufällige (viele kurze Sackgassen). |
| `generateMessageMaze(text, cols, rows, seed, windiness)` | Der Einstieg: Text aufbereiten und umbrechen, Route bauen, freibrechen, Rest wachsen lassen. Gibt `{ maze, route, hint }` zurück; `hint` meldet, wenn der Text nicht ins Raster passt. |

## seite.js

| Name | Was es tut |
|---|---|
| `scene` | Der Zustand zwischen zwei Bildern: Labyrinth, Route, Zellgröße, Fortschritt des Lichtpunkts. |
| `readSettings()` | Liest alle Regler aus der Seitenleiste in ein Objekt. |
| `fitCanvasToStage()` | Passt die Pixelzahl des Canvas an Anzeigegröße und Bildschirmauflösung an. |
| `regenerate()` | Berechnet aus Fenster- und Zellgröße das Raster, erzeugt ein neues Labyrinth und startet die Animation von vorn. |
| `centerOf(cell)` | Rechnet eine Zelle in den Canvas-Punkt ihrer Mitte um. |
| `positionAt(progress)` | Wo auf der Route der Punkt nach `progress` Schritten steht – auch zwischen zwei Zellen. |
| `drawWalls(settings)` | Zeichnet alle Wände, mit Lücke am Eingang (links) und Ausgang (rechts). |
| `strokeWalkedSegments(wantLetters)` | Zeichnet von der gelaufenen Strecke nur die Buchstaben- oder nur die Verbinder-Stücke. |
| `drawTrail(settings)` | Zeichnet die Spur: erst blass die Verbinder, darüber leuchtend die Buchstaben. |
| `drawPlannedPath(settings)` | Zeichnet gestrichelt den Weg, der noch vor dem Punkt liegt (abschaltbar). |
| `drawDot(settings)` | Zeichnet den leuchtenden Lichtpunkt. |
| `drawScene(settings)` | Ein komplettes Bild: Hintergrund, Wände, Weg, Spur, Punkt. |
| `onAnimationFrame(now)` | Läuft pro Bildschirm-Bild: bewegt den Punkt je nach Tempo weiter und zeichnet neu, wenn sich etwas geändert hat. |
| `showSliderValues()` | Schreibt neben jeden Schieberegler seinen Wert. |
| `connectControls()` | Verbindet Regler und Knöpfe: Text, Seed, Zellgröße und Gewundenheit erzeugen ein neues Labyrinth, alles andere ändert nur das Aussehen. |

## Bekannte Schwächen

- Die Buchstaben-Gänge sind schon vor dem Lauf in den Wänden zu erahnen
  (auffällig gerade Gänge, vor allem die durchgehende Verbindungsspur).
- Schrägen gibt es nicht: N und V sind Notlösungen, 0/O, 2/Z und 5/S sehen gleich aus.
- Ändert sich die Fenstergröße, beginnt die Animation von vorn.
