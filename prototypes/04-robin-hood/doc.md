# Labyrinth-Prototyp 4 „Robin Hood"

Wegwerf-Prototyp, aufbauend auf `../02-hoerauf-labyrinth`. Die Logik (Route durch die
Buchstaben, Labyrinth drumherum) ist dieselbe, das Aussehen ist neu:

- Das Labyrinth ist eine **Burg von oben**: Steinmauern mit Zinnen und Wehrgang,
  Pfeiler, Türmchen, große Ecktürme mit Dach, gepflasterter Hof, Wiese drumherum.
- Statt des Lichtpunkts läuft ein **grüner Robin Hood** (Hut mit roter Feder, Köcher,
  gespannter Bogen). Er schaut in Laufrichtung und dreht sich an Ecken mit.
- Statt der Leuchtspur jagt ihn eine **Reihe von Wachen** (Eisenhut, roter Wappenrock,
  Hellebarde) im Gänsemarsch auf exakt demselben Weg.

Öffnen: `index.html` direkt im Browser (kein Server, kein Build nötig).

## Die Idee in fünf Schritten

1. **Route bauen:** Der komplette Weg von Robin Hood wird berechnet, Zelle für Zelle:
   Anlauf (Eingang → links neben den Text), Text (alle Buchstaben), Ablauf (rechts
   neben dem Text → Ausgang). Unverändert aus Prototyp 2.
2. **Route freibrechen**, 3. **Rest wachsen lassen:** ebenfalls unverändert.
4. **Burg malen:** Aus dem Labyrinth wird einmal ein Bild von Wiese, Hof und Mauern
   gemalt und aufbewahrt (`scene.backdrop`).
5. **Abspielen:** Pro Bild wird das Burg-Bild kopiert, darauf kommen Fackelschein,
   Münzen und die Figuren.

## Wer steht wo? Eine einzige Zahl

`scene.progress` ist der Fortschritt von Robin Hood auf der Route (in Schritten, mit
Nachkommastellen). Jede Wache läuft dieselbe Route, nur später:

```
Fortschritt der Wache n  =  scene.progress − Vorsprung − n × Abstand      (n = 0 ist die vorderste)
```

Daraus folgt alles Weitere:

- Die Wachen laufen garantiert denselben Weg und können Robin Hood nie einholen.
- Ist der Fortschritt einer Wache negativ, ist sie noch nicht losgelaufen – sie kommt
  also von selbst nach Robin Hood durch den Eingang.
- `scene.progress` läuft über das Routenende hinaus weiter, bis auch die letzte Wache
  am Routenende ist (`finalProgress`). So folgen ihm alle durch den Ausgang hinaus.
- Die Regler für Anzahl, Vorsprung und Abstand wirken sofort, ohne Neustart.

Die Route beginnt und endet 3 Zellen außerhalb der Burg (`STEPS_OUTSIDE`). Das liegt
außerhalb des sichtbaren Bildes, die Figuren laufen also ins Bild hinein und hinaus.

## Wie die Wachen den Text zeigen

Die Wachen-Reihe ersetzt die Leuchtspur: Sie bedeckt immer das zuletzt gelaufene Stück
des Wegs. Drei Dinge helfen beim Lesen:

- **Länge der Reihe:** Ein Buchstabe kostet im Schnitt rund 21 Routen-Schritte
  (einschließlich des Wegs zum nächsten). Die Reihe ist `Vorsprung + Anzahl × Abstand`
  Schritte lang. Standard: 50 Wachen × 0,9 = 45 Schritte ≈ 2 Buchstaben gleichzeitig.
  Für ein ganzes Wort braucht man 150–200 Wachen.
- **Fackelschein:** Jede Wache beleuchtet ein kurzes Stück Weg um sich herum
  (`TORCH_REACH`). In Buchstaben-Gängen (`LETTER`) ist der Schein kräftig, auf
  Verbindungswegen (`CONNECTOR`) schwach. So leuchtet genau der Buchstabe gelb auf,
  in dem die Reihe gerade steckt. Beide Stärken haben einen Regler; auf 0 gestellt
  sieht man die reinen Wachen.
- **Spur zusätzlich zeigen** (Schalter, Standard AUS): Robin Hoods Fußabdrücke bleiben
  liegen – kräftig in Buchstaben-Gängen, blass auf Verbindungswegen. Damit steht am
  Ende wie in Prototyp 2 der ganze Text da. Gedacht zum Vergleichen.

## Arten von Wegstücken

| Art | Bedeutung | Fackelschein | Fußspuren |
|---|---|---|---|
| `LETTER` | gehört zu einem Buchstaben | kräftig | kräftig |
| `CONNECTOR` | An-/Ablauf, Verbindungsspur, Rückweg | schwach | blass |
| `SILENT` | Abstecher zu einem Umlaut-Punkt und zurück | keiner | keine |

## Umlaute

Wie in Prototyp 2 sitzen die Punkte von Ä, Ö, Ü in der obersten Zeile des
Buchstaben-Kästchens, und die Route macht einen Abstecher dorthin (`isDot` am
Routenschritt). Neu ist, was dort zurückbleibt: **Robin Hood verliert an jedem
Umlaut-Punkt ein Häufchen Goldmünzen.** Die Münzen bleiben liegen (auch ohne
zugeschaltete Spur), die Wachen rennen einfach darüber.

## Größen

Alles hängt an der Zellgröße: Mauerstärke (Regler, Standard 30 % der Zelle), Türme,
Figuren (Schulterbreite etwa eine halbe Zelle, Regler „Größe der Figuren").
Beim Laden wählt die Seite die größte Zellgröße bis 34, bei der der Text noch ohne
zerteiltes Wort ins Fenster passt (`largestCellSizeThatFits`). Danach gilt der Regler.

## schrift.js

Unverändert bis auf Kommentare.

| Name | Was es tut |
|---|---|
| `GLYPHS` | Pro Zeichen die Liste der Wegpunkte `[x, y]` (oder `[x, y, DOT]`) im 3×5-Kästchen. Robin Hood läuft sie der Reihe nach geradlinig ab. Erster und letzter Wegpunkt liegen in der untersten Zeile. |
| `normalizeText(text)` | Wandelt die Eingabe in darstellbaren Text: Großbuchstaben, ß wird SS, unbekannte Zeichen entfernt, Mehrfach-Leerzeichen zusammengefasst. Umlaute bleiben. |
| `wrapText(text, maxCharsPerLine)` | Bricht an Wortgrenzen in Zeilen um. Zu lange Wörter werden hart zerteilt. |

## labyrinth.js

Gegenüber Prototyp 2 geändert: `STEPS_OUTSIDE` ist 3 statt 2, `textCapacity` und
`textFitsGrid` sind neu. Alles andere ist gleich.

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
| `appendGlyph(route, waypoints, glyphLeft, glyphTop)` | Hängt den Weg durch einen Buchstaben an und vergibt dabei die Arten (Einstieg = Verbinder, Abstecher zum Umlaut-Punkt = `SILENT`, sonst Buchstabe). |
| `appendTextRoute(route, lines, cols, block)` | Hängt den Weg durch den ganzen Text an: vom linken Tor über alle Zeilen zum rechten Tor. |
| `pickBorderCell(side, cols, rows, columnRange, random)` | Wählt eine zufällige Zelle am gewünschten Rand; oben/unten nur im angegebenen Spaltenbereich. |
| `cellOutside(borderCell, side, distance)` | Die Zelle, die so viele Schritte außerhalb vor einer Randzelle liegt. |
| `buildRoute(lines, cols, rows, entranceSide, exitSide, random, detour)` | Baut die ganze Route: von außen herein, Anlauf, Text, Ablauf, hinaus. Gibt `{ route, entrance, exit }` zurück. |
| `carveRoute(maze, route)` | Bricht entlang der Route die Wände heraus (Schritte außerhalb des Rasters werden übersprungen). |
| `textCapacity(cols, rows)` | **Neu.** Wie viel Text ins Raster passt: `{ maxCharsPerLine, maxLines }`. |
| `textFitsGrid(text, cols, rows)` | **Neu.** Passt der Text vollständig ins Raster, ohne dass ein Wort zerteilt wird? |
| `generateMessageMaze(text, cols, rows, seed, options)` | Der Einstieg: Text aufbereiten und umbrechen, Seiten für Ein-/Ausgang festlegen, Route bauen, freibrechen, Rest wachsen lassen. Gibt `{ maze, route, hint, entrance, exit }` zurück. |

## burg.js (neu)

Malt Boden und Mauern. Wird nur einmal pro Labyrinth aufgerufen, nicht pro Bild.
Alle Funktionen bekommen dieselbe Beschreibung `castle` (Labyrinth, Ein-/Ausgang,
Zellgröße, Lage auf dem Canvas, Mauerstärke, Canvas-Größe, Seed).

| Name | Was es tut |
|---|---|
| `CASTLE_COLORS` | Alle Farben der Burg an einer Stelle. |
| `gridPoint(castle, gridX, gridY)` | Rechnet einen Gitterpunkt (Ecke einer Zelle) in Canvas-Koordinaten um. |
| `isGateAt(castle, x, y, side)` | Liegt an dieser Zelle und Seite der Eingang oder Ausgang? |
| `collectWallSegments(castle)` | Sammelt alle Mauerstücke als Liste `{ x1, y1, x2, y2 }` in Gitterpunkten. Jedes Stück ist eine Zellkante lang; an den Toren bleibt die Außenmauer offen. |
| `collectJunctions(segments)` | Zählt für jeden Gitterpunkt, wie viele waagrechte und senkrechte Mauerstücke dort enden. |
| `isStraightRun(junction)` | Läuft die Mauer an diesem Gitterpunkt einfach geradeaus durch? (Dann steht dort nichts.) |
| `isLooseEnd(junction)` | Endet hier eine Mauer frei im Hof? (Dann steht dort ein Türmchen.) |
| `outerCorners(maze)` | Die vier Ecken der Außenmauer als Gitterpunkte. |
| `gateTowerSpots(castle, gate)` | Die beiden Stellen neben einem Tor, an denen die Tortürme stehen – etwas vom Tor weggerückt, damit die Durchfahrt frei bleibt. |
| `traceWalls(ctx, castle, segments, shift)` | Legt alle Mauerstücke als Linien in den aktuellen Pfad, auf Wunsch nach rechts unten verschoben (für den Schatten). Zeichnet noch nichts. |
| `fillDisc(ctx, x, y, radius, color)` | Gefüllter Kreis. |
| `scatterSpots(ctx, area, spotSize, spacing, colors, random)` | Streut kleine ovale Flecken zufällig über ein Rechteck (Pflastersteine, Grasbüschel). Alle Flecken einer Farbe werden gemeinsam gefüllt. |
| `drawGrass(ctx, castle, random)` | Die Wiese: füllt das ganze Canvas grün und streut Grasbüschel darüber. |
| `drawPathToGate(ctx, castle, gate)` | Der Sandweg, der von einem Tor nach draußen bis über den Bildrand führt. |
| `drawCourtyard(ctx, castle, random)` | Der gepflasterte Hof: die Fläche des Labyrinths mit Pflastersteinen. |
| `drawShadows(ctx, castle, segments, towers)` | Die Schatten von Mauern und Türmen, nach rechts unten versetzt. |
| `drawWallBodies(ctx, castle, segments)` | Die Mauern in fünf Schichten: dunkler Umriss, Brüstung, Zinnen (helle gestrichelte Linie), Wehrgang (schmaler Streifen in der Mitte, teilt die Striche in zwei Zinnen-Reihen), Fugen. |
| `drawPillar(ctx, x, y, size)` | Quadratischer Pfeiler: steht, wo eine Mauer abknickt oder sich verzweigt. |
| `drawTurret(ctx, x, y, radius)` | Offenes rundes Türmchen mit Zinnenkranz: steht an freien Mauerenden. |
| `drawRoofedTower(ctx, x, y, radius)` | Großer Turm mit blauem Kegeldach (helle und schattige Hälfte, Grate): steht an den vier Ecken und beidseits der Tore. |
| `planTowers(castle, junctions)` | Legt fest, wo welche Türme, Türmchen und Pfeiler stehen und wie groß sie sind. |
| `drawCastle(ctx, castle)` | Malt die ganze Burg in der richtigen Reihenfolge: Wiese, Wege, Hof, Schatten, Mauern, Pfeiler, Türmchen, Türme. |

## figuren.js (neu)

Zeichnet Robin Hood, die Wachen und die Goldmünzen. Jede Figur wird in einem eigenen
Koordinatensystem gezeichnet: Sie steht im Ursprung, schaut nach rechts, und die Einheit
ist die Zellgröße. `drawFigure` schiebt, dreht und vergrößert das an die richtige Stelle.
Eine Haltung ist `pose = { x, y, heading, size, swing }`; `swing` pendelt beim Laufen
zwischen −1 und 1.

| Name | Was es tut |
|---|---|
| `ROBIN`, `GUARD`, `COINS` | Die Farben der Figuren und der Münzen. |
| `fillEllipse(ctx, x, y, radiusX, radiusY, color)` | Gefüllte Ellipse. |
| `outlinedEllipse(ctx, x, y, radiusX, radiusY, color, outlineColor)` | Gefüllte Ellipse mit dunklem Rand. |
| `strokeLine(ctx, x1, y1, x2, y2, width, color)` | Linie mit runden Enden. |
| `outlinedLine(ctx, x1, y1, x2, y2, width, color, outlineColor)` | Linie mit dunklem Rand (erst breit dunkel, dann schmaler farbig). |
| `drawFigure(ctx, pose, drawBody)` | Stellt das Koordinatensystem der Figur her, zeichnet ihren Schatten (immer nach rechts unten), dreht in Blickrichtung – plus ein leichtes Mitdrehen und Größerwerden im Takt der Schritte (Wippen) – und ruft `drawBody` auf. |
| `drawFeet(ctx, swing, color)` | Die beiden Füße: einer vorn, einer hinten, abwechselnd. |
| `drawQuiver(ctx)` | Robin Hoods Köcher schräg auf dem Rücken mit drei Pfeil-Federn. |
| `drawBowAndArms(ctx, swing)` | Robin Hoods Arme, der gespannte Bogen quer vor ihm, Sehne, Pfeil und Hände. |
| `drawRobinHat(ctx)` | Der Hut von oben: hinten rund, vorn spitz, mit roter Feder nach hinten. |
| `drawRobinHood(ctx, pose)` | Der ganze Robin Hood: Füße, Schultern, Köcher, Bogen mit Armen, Hut. |
| `drawHalberd(ctx)` | Die Hellebarde: Stange an der rechten Seite der Wache, nach vorn gerichtet, mit Spitze und Beilklinge. |
| `drawGuardTorso(ctx)` | Der Oberkörper der Wache: Kettenhemd an den Schultern, roter Wappenrock mit gelbem Streifen. |
| `drawGuardArms(ctx, swing)` | Die Arme der Wache: die rechte Hand hält die Hellebarde, der linke Arm pendelt. |
| `drawGuardHelmet(ctx, isCaptain)` | Der Eisenhut von oben (Krempe, Kuppel, Grat). Der Hauptmann – die vorderste Wache – trägt zusätzlich einen gelben Federbusch. |
| `drawGuard(ctx, pose, isCaptain)` | Die ganze Wache: Füße, Hellebarde, Oberkörper, Arme, Helm. |
| `drawCoinPile(ctx, x, y, size)` | Ein Häufchen aus sieben Goldmünzen (der Umlaut-Punkt). |

## seite.js

| Name | Was es tut |
|---|---|
| `scene` | Der Zustand zwischen zwei Bildern: Labyrinth, Route, Ein-/Ausgang, Zellgröße, Mauerstärke, das fertige Burg-Bild, Robin Hoods Fortschritt, Pause. |
| `readSettings()` | Liest alle Regler in ein Objekt. |
| `fitCanvasToStage()` | Passt die Pixelzahl des Canvas an Anzeigegröße und Bildschirmauflösung an. |
| `gridSizeFor(cellSize)` | Wie viele Spalten und Zeilen bei dieser Zellgröße ins Fenster passen, wenn rundherum ein Streifen Wiese frei bleibt. |
| `largestCellSizeThatFits(text)` | Sucht die größte Zellgröße (höchstens 34), bei der der Text ohne zerteiltes Wort ins Fenster passt. Wird einmal beim Laden benutzt. |
| `restartAnimation()` | Setzt Robin Hood (und damit alle Wachen) an den Anfang. |
| `paintBackdrop(settings)` | Malt die Burg auf ein unsichtbares Canvas und merkt es sich als `scene.backdrop`. |
| `chaseLength(settings)` | Robin Hoods Vorsprung vor der letzten Wache, in Routen-Schritten. |
| `finalProgress(settings)` | Der Fortschritt, bei dem die Jagd vorbei ist: auch die letzte Wache ist am Routenende. |
| `guardProgress(guardIndex, settings)` | Wo auf der Route die Wache mit dieser Nummer steht. |
| `showStatus(settings)` | Schreibt Rastergröße, Schrittzahl und Dauer der Jagd unter das Textfeld. |
| `regenerate()` | Berechnet das Raster, erzeugt ein neues Labyrinth, malt die Burg und startet die Jagd neu. |
| `centerOf(cell)` | Rechnet eine Zelle in den Canvas-Punkt ihrer Mitte um. |
| `positionAt(progress)` | Wo auf der Route man nach `progress` Schritten steht – auch zwischen zwei Zellen. |
| `directionOfStep(step)` | Die Richtung eines Routen-Schritts als Winkel. |
| `blendAngles(from, to, share)` | Ein Winkel zwischen zwei Winkeln, über den kürzeren Drehweg. |
| `headingAt(progress)` | Wohin eine Figur schaut. Kurz vor und nach einer Ecke dreht sie sich allmählich in die neue Richtung. |
| `poseAt(progress, settings, strideShift)` | Die komplette Haltung einer Figur: Ort, Blickrichtung, Größe, Schritt-Takt. |
| `advanceChase(steps, settings)` | Lässt Robin Hood (und damit alle Wachen) weiterlaufen, höchstens bis `finalProgress`. |
| `traceRouteStretch(fromProgress, toProgress, kind)` | Legt die Wegstücke einer Art, die zwischen zwei Fortschritts-Werten liegen, in den aktuellen Pfad. |
| `drawTorchlight(settings)` | Der Fackelschein: beleuchtet um jede Wache ein kurzes Stück Weg, in Buchstaben-Gängen kräftig, auf Verbindungswegen schwach. |
| `traceFootprints(kind)` | Legt Robin Hoods Fußabdrücke auf Wegstücken einer Art in den aktuellen Pfad (abwechselnd links und rechts). |
| `drawFootprints()` | Die zuschaltbare Spur: kräftige Abdrücke in Buchstaben-Gängen, blasse auf Verbindungswegen. |
| `drawDroppedCoins()` | Die Goldmünzen an allen Umlaut-Punkten, an denen Robin Hood schon war. |
| `drawPlannedPath()` | Zeichnet gestrichelt den Weg, der noch vor Robin Hood liegt (abschaltbar). |
| `drawChase(settings)` | Zeichnet alle Wachen, die gerade unterwegs sind (die hinterste zuerst), und zuletzt Robin Hood. |
| `drawScene(settings)` | Ein komplettes Bild: Burg-Bild kopieren, dann geplanter Weg, Fackelschein, Fußspuren, Münzen, Figuren. |
| `onAnimationFrame(now)` | Läuft pro Bildschirm-Bild: lässt die Jagd weiterlaufen und zeichnet neu, solange sie läuft oder sich etwas geändert hat. |
| `showSliderValues()` | Schreibt neben jeden Schieberegler seinen Wert. |
| `togglePause()` | Hält die Jagd an bzw. lässt sie weiterlaufen. |
| `jumpToEnd()` | Stellt Robin Hood ans Routenende (er ist dann schon draußen); die Wachen laufen ihm von dort noch hinterher. |
| `connectControls()` | Verbindet Regler und Knöpfe mit ihren Aktionen. |

## Regler: was blieb, was flog raus

- **Geblieben:** Text, Seed, Zellgröße, Gewundenheit, Ein-/Ausgangsseite, Umwege,
  Tempo, „Nochmal abspielen", „Ans Ende springen", „Geplanten Weg gestrichelt zeigen".
- **Neu:** Anzahl der Wachen, Vorsprung, Abstand zwischen den Wachen, Größe der Figuren,
  Fackelschein (Buchstaben / Verbindungswege), „Spur zusätzlich zeigen", Mauerstärke, Pause.
- **Entfallen:** Farbschema hell/dunkel, alle Farbwähler, Leuchten, Spurstärke,
  Verblassen und Rest-Helligkeit, Wandstärke in Pixeln (jetzt Mauerstärke in Prozent).

## Bekannte Schwächen

- **Man liest Buchstabe für Buchstabe, nicht das Wort.** Mit 50 Wachen sind etwa zwei
  Buchstaben gleichzeitig beleuchtet. Ist die Reihe weitergezogen, ist der Buchstabe
  wieder weg (außer mit zugeschalteten Fußspuren).
- **Gegenverkehr im selben Gang:** Viele Buchstaben laufen ein Stück doppelt (z. B. das
  H). Dort laufen Wachen durcheinander hindurch, weil alle auf der Mittellinie gehen.
- Robin Hood und die Wachen laufen eckig um die Ecken (sie drehen sich weich, aber
  der Weg selbst hat keine Rundung). Eine Kehrtwende am Gangende ist eine Drehung auf der Stelle.
- Die Figuren werden über die Mauern gezeichnet. An Ecken ragen Pfeilspitze und
  Hellebarde kurz über eine Mauer, an den Toren über die Tortürme.
- Bei kleiner Zellgröße (unter etwa 24) sind die Figuren nur noch bunte Punkte:
  grün = Robin Hood, rot = Wachen.
- Die Figuren werden für jedes Bild neu gezeichnet. Mit 50 Wachen ist das unkritisch;
  mit 200 Wachen kann es auf schwachen Rechnern ruckeln.
- Liegt ein Tor direkt neben einer Ecke, überlappen Torturm und Eckturm.
- Wie in Prototyp 2: Die Buchstaben-Gänge sind schon vorher in den Mauern zu erahnen,
  Schrägen gibt es nicht, und bei geänderter Fenstergröße beginnt alles von vorn.
- Nach der Jagd ist die Burg leer (bis auf die Münzen). „Ans Ende springen" zeigt
  deshalb den Moment, in dem Robin Hood gerade draußen ist und die Wachen noch folgen.

## Für später vorbereitet

`scene.exit.side` sagt, wohin Robin Hood geflohen ist. Daran kann das geplante
„Bild schiebt in diese Richtung weiter zum nächsten Labyrinth" anknüpfen.
