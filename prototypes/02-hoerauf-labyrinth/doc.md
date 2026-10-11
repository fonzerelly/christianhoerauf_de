# Labyrinth-Prototyp 2 „Hörauf"

Wegwerf-Prototyp, aufbauend auf `../01-hello-labyrinth`. Neu gegenüber Prototyp 1:

- **Helles Farbschema** (weiß, blaue Wände wie in der Skizze), per Knopf umschaltbar auf dunkel
- **Verblassende Leuchtspur** mit einstellbarer Dauer und Rest-Helligkeit
- **Umlaute** Ä, Ö, Ü mit echten Punkten
- **Eingang und Ausgang wechseln**: der Lichtpunkt kommt von links, oben oder unten
  und geht nach rechts, oben oder unten – auf einem gewundenen Weg
- Der Lichtpunkt bleibt nicht mehr stehen, sondern **verlässt das Labyrinth**

Öffnen: `index.html` direkt im Browser (kein Server, kein Build nötig).

## Die Idee in vier Schritten

1. **Route bauen:** Der komplette Weg des Lichtpunkts wird berechnet, Zelle für Zelle.
   Er besteht aus Anlauf (Eingang → links neben den Text), Text (alle Buchstaben)
   und Ablauf (rechts neben dem Text → Ausgang).
2. **Route freibrechen:** Entlang dieses Wegs werden die Wände entfernt.
3. **Rest wachsen lassen:** Alle übrigen Zellen werden mit zufälligen Gängen gefüllt.
   Dabei wird nur in unberührte Zellen gegraben, es entsteht also keine Abkürzung.
4. **Abspielen:** Der Lichtpunkt läuft die Route ab und hinterlässt die Leuchtspur.

Der Text bestimmt den Mittelteil der Route, der Seed alles andere (Eingang, Ausgang,
An- und Ablauf, Füllmaterial).

## Reviere

Damit sich die drei Routenteile nicht kreuzen, hat jeder sein eigenes Gebiet:

```
+--------------------+--------------------+
|  Anlauf            |            Ablauf  |
|  (linke Hälfte) +-----------+ (rechte   |
|               T |  T E X T  | T  Hälfte)|
|                 +-----------+           |
+--------------------+--------------------+
T = Tor: hier übergibt der Anlauf an den Text bzw. der Text an den Ablauf
```

Das Text-Revier ist der Textblock plus je eine Spalte Rand links und rechts;
in diesen Randspalten laufen die Zeilenwechsel.

## Aufbau einer Textzeile

```
5 Zeilen   Buchstaben (je 3 Zellen breit, 1 Zelle Abstand)
1 Zeile    Verbindungsspur: von Buchstabe zu Buchstabe
1 Zeile    Rückweg: nach links zum Anfang der nächsten Textzeile
```

## Arten von Wegstücken

| Art | Bedeutung | Spur |
|---|---|---|
| `LETTER` | gehört zu einem Buchstaben | kräftig, leuchtend |
| `CONNECTOR` | An-/Ablauf, Verbindungsspur, Rückweg | blass (Regler) |
| `SILENT` | Hüpfer zu einem Umlaut-Punkt und zurück | keine |

## Umlaute

Ä, Ö, Ü sind eine Zeile niedriger gezeichnet (Zeilen 1–4), in Zeile 0 sitzen die
Punkte. Ein Wegpunkt `[x, y, DOT]` heißt: ohne Spur dorthin, einen Punkt
hinterlassen (`isDot` am Routenschritt), ohne Spur zurück.

## Verblassen

Für jeden gelaufenen Schritt wird die Uhrzeit gemerkt (`scene.walkedAt`). Die
Helligkeit fällt ab dann über „Verblasst innerhalb von" Sekunden linear von 100 %
auf die „Rest-Helligkeit". Die Uhr läuft weiter, wenn der Lichtpunkt weg ist –
am Ende steht also der ganze Text in Rest-Helligkeit da. 0 Sekunden = kein Verblassen.

## schrift.js

| Name | Was es tut |
|---|---|
| `GLYPHS` | Pro Zeichen die Liste der Wegpunkte `[x, y]` (oder `[x, y, DOT]`) im 3×5-Kästchen. Der Punkt läuft sie der Reihe nach geradlinig ab. Erster und letzter Wegpunkt liegen in der untersten Zeile. |
| `normalizeText(text)` | Wandelt die Eingabe in darstellbaren Text: Großbuchstaben, ß wird SS, unbekannte Zeichen entfernt, Mehrfach-Leerzeichen zusammengefasst. Umlaute bleiben. |
| `wrapText(text, maxCharsPerLine)` | Bricht an Wortgrenzen in Zeilen um. Zu lange Wörter werden hart zerteilt. |

## labyrinth.js

| Name | Was es tut |
|---|---|
| `createRandom(seed)` | Zufallsgenerator (Mulberry32), der bei gleichem Seed dieselbe Zahlenfolge liefert. |
| `pickRandom(list, random)` | Zufälliges Element einer Liste. |
| `randomBetween(min, max, random)` | Zufällige ganze Zahl von min bis max (beide eingeschlossen). |
| `createEmptyMaze(cols, rows)` | Raster, in dem jede Zelle zugemauert ist. `openRight` / `openDown` merken sich Durchgänge, `visited` ob die Zelle erschlossen ist. |
| `isInside(maze, cell)` | Liegt die Zelle im Raster? |
| `carvePassage(maze, from, to)` | Entfernt die Wand zwischen zwei Nachbarzellen und markiert beide als erschlossen. |
| `neighboursOf(cell)` | Die vier Nachbarzellen (auch außerhalb des Rasters). |
| `unvisitedNeighbours(maze, cell)` | Nachbarn im Raster, die noch unberührt sind. |
| `connectedNeighbours(maze, cell)` | Nachbarn, zu denen ein Durchgang offen ist. |
| `visitedCells(maze)` | Alle schon erschlossenen Zellen. |
| `shuffle(list, random)` | Mischt eine Liste (Fisher-Yates). |
| `growMaze(maze, startCells, random, windiness)` | „Growing Tree": lässt von den Startzellen aus Gänge in alle unberührten Zellen wachsen. `windiness` nahe 1: lange, gewundene Gänge; nahe 0: viele kurze Sackgassen. |
| `findPathThroughMaze(maze, from, to)` | Breitensuche: der Weg durch die offenen Gänge von einer Zelle zur anderen. |
| `findWindingPath(cols, rows, isAllowed, from, to, random, detour)` | Erfindet einen gewundenen Weg: baut über den erlaubten Zellen ein Wegwerf-Labyrinth und nimmt den darin einzigen Weg von `from` nach `to`. `detour` steuert die Umwege. |
| `layoutTextBlock(lines, cols, rows)` | Berechnet die zentrierte Lage des Textblocks (äußerste Zellen links/rechts/oben/unten). |
| `walkTo(route, x, y, kind)` | Verlängert die Route in gerader Linie bis zur Zielzelle, eine Zelle pro Schritt, mit der angegebenen Art. |
| `appendGlyph(route, waypoints, glyphLeft, glyphTop)` | Hängt den Weg durch einen Buchstaben an und vergibt dabei die Arten (Einstieg = Verbinder, Umlaut-Hüpfer = ohne Spur, sonst Buchstabe). |
| `appendTextRoute(route, lines, cols, block)` | Hängt den Weg durch den ganzen Text an: vom linken Tor über alle Zeilen zum rechten Tor. |
| `pickBorderCell(side, cols, rows, columnRange, random)` | Wählt eine zufällige Zelle am gewünschten Rand; oben/unten nur im angegebenen Spaltenbereich. |
| `cellOutside(borderCell, side, distance)` | Die Zelle, die so viele Schritte außerhalb vor einer Randzelle liegt. |
| `buildRoute(lines, cols, rows, entranceSide, exitSide, random, detour)` | Baut die ganze Route: von außen herein, Anlauf, Text, Ablauf, hinaus. Gibt `{ route, entrance, exit }` zurück. |
| `carveRoute(maze, route)` | Bricht entlang der Route die Wände heraus (Schritte außerhalb des Rasters werden übersprungen). |
| `generateMessageMaze(text, cols, rows, seed, options)` | Der Einstieg: Text aufbereiten und umbrechen, Seiten für Ein-/Ausgang festlegen, Route bauen, freibrechen, Rest wachsen lassen. Gibt `{ maze, route, hint, entrance, exit }` zurück. |

## seite.js

| Name | Was es tut |
|---|---|
| `scene` | Der Zustand zwischen zwei Bildern: Labyrinth, Route, Ein-/Ausgang, Fortschritt, Uhr, Laufzeiten der Schritte. |
| `THEMES` | Die beiden Farbschemata (hell, dunkel). |
| `readSettings()` | Liest alle Regler in ein Objekt. |
| `applyTheme(theme)` | Stellt die Farb-Regler auf ein Farbschema. |
| `fitCanvasToStage()` | Passt die Pixelzahl des Canvas an Anzeigegröße und Bildschirmauflösung an. |
| `restartAnimation()` | Setzt den Lichtpunkt an den Anfang und vergisst die Spur. |
| `regenerate()` | Berechnet das Raster aus Fenster- und Zellgröße, erzeugt ein neues Labyrinth und startet die Animation neu. |
| `centerOf(cell)` | Rechnet eine Zelle in den Canvas-Punkt ihrer Mitte um. |
| `positionAt(progress)` | Wo auf der Route der Punkt nach `progress` Schritten steht – auch zwischen zwei Zellen. |
| `advanceDot(steps)` | Bewegt den Lichtpunkt weiter und merkt sich für jeden fertig gelaufenen Schritt die Uhrzeit. |
| `drawWalls(settings)` | Zeichnet alle Wände, mit Lücken an Eingang und Ausgang (egal an welchem Rand). |
| `brightnessLevelOf(step, settings)` | Wie hell ein gelaufener Schritt noch leuchtet, als Stufe 0–16. |
| `strokeWalkedSegments(kind, level, levelOfStep)` | Zeichnet die gelaufenen Wegstücke einer Art und einer Helligkeitsstufe in einem Rutsch. |
| `fillUmlautDots(level, levelOfStep, settings)` | Zeichnet die schon besuchten Umlaut-Punkte einer Helligkeitsstufe. |
| `drawTrail(settings)` | Zeichnet die Spur: erst blass die Verbinder, darüber die Buchstaben und Punkte, jeweils Stufe für Stufe. |
| `drawPlannedPath(settings)` | Zeichnet gestrichelt den Weg, der noch vor dem Punkt liegt (abschaltbar). |
| `drawDot(settings)` | Zeichnet den Lichtpunkt. |
| `drawScene(settings)` | Ein komplettes Bild. Spur und Punkt werden auf die Labyrinth-Fläche beschnitten, so taucht der Punkt am Eingang auf und verschwindet am Ausgang. |
| `onAnimationFrame(now)` | Läuft pro Bildschirm-Bild: stellt die Uhr weiter, bewegt den Punkt und zeichnet neu, solange er läuft oder die Spur noch verblasst. |
| `showSliderValues()` | Schreibt neben jeden Schieberegler seinen Wert. |
| `connectControls()` | Verbindet Regler und Knöpfe mit ihren Aktionen. |

## Bekannte Schwächen

- Die Buchstaben-Gänge sind schon vor dem Lauf in den Wänden zu erahnen
  (auffällig gerade Gänge, vor allem Verbindungsspur und Rückweg).
- Schrägen gibt es nicht: N und V sind Notlösungen, 0/O, 2/Z und 5/S sehen gleich aus.
- Beim Verblassen entstehen an den Übergängen zwischen zwei Helligkeitsstufen
  kleine dunklere Pünktchen auf den Verbindungswegen.
- Ändert sich die Fenstergröße, beginnt die Animation von vorn.

## Für später vorbereitet

`scene.exit.side` sagt, wohin der Lichtpunkt verschwunden ist. Daran kann das
geplante „Bild schiebt in diese Richtung weiter zum nächsten Labyrinth" anknüpfen;
der Eingang des nächsten Labyrinths müsste dann am gegenüberliegenden Rand liegen.
