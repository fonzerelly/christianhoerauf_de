# Labyrinth-Prototyp 3 „plastisch, blau, mehrere Seiten"

Wegwerf-Prototyp, aufbauend auf `../02-hoerauf-labyrinth`. Neu gegenüber Prototyp 2:

- **Plastische Wände**: dicker, grau, mit Schlagschatten und heller/dunkler Kante.
  Regler für Wandstärke, Schattenversatz, Schattenweichheit, Schattenstärke, Kantenlicht.
- **Lichtpunkt und Leuchtspur sind blau**, die Wände deshalb neutral grau (helles Schema
  bleibt Standard, alle Farben bleiben per Regler änderbar, auch die Schattenfarbe).
- **Kurzlebige Leuchtspur**: jedes Wegstück leuchtet kurz voll und blendet dann ganz aus.
  Man sieht immer nur die letzten ein bis zwei Buchstaben, danach wieder nur das Labyrinth.
- **Mehrere Labyrinth-Seiten**: Passt der Text nicht auf den Bildschirm, wird er nicht mehr
  abgeschnitten, sondern auf mehrere Seiten verteilt. Der Lichtpunkt verlässt die Seite,
  die Spur verglimmt, das Bild schiebt in die Richtung weiter, in die er verschwunden ist,
  und auf der nächsten Seite kommt er genau gegenüber wieder herein.
- **Verallgemeinerte Reviere**: Der Eingang darf jetzt auch oben/unten in der rechten
  Hälfte liegen (das passiert nach einem Seitenwechsel nach oben oder unten).
- Die Spur wird ohne Überlappung gezeichnet – die „dunkleren Pünktchen" aus Prototyp 2 sind weg.

Öffnen: `index.html` direkt im Browser (kein Server, kein Build nötig).

Mehrseitigkeit ausprobieren: Der Standardtext braucht bei Zellgröße 24 auf einem
Laptop-Bildschirm drei Seiten. Auf großen Bildschirmen den Regler „Höchstens Zeilen pro
Seite" herunterdrehen oder die Zellgröße erhöhen.

## Die Idee in fünf Schritten

1. **Text verteilen:** Der Text wird in Zeilen umbrochen, die Zeilen werden auf Seiten verteilt.
2. **Route bauen (je Seite):** Der komplette Weg des Lichtpunkts wird berechnet, Zelle für
   Zelle: Anlauf (Eingang → links neben den Text), Text (alle Buchstaben), Ablauf
   (rechts neben dem Text → Ausgang).
3. **Route freibrechen:** Entlang dieses Wegs werden die Wände entfernt.
4. **Rest wachsen lassen:** Alle übrigen Zellen werden mit zufälligen Gängen gefüllt.
   Dabei wird nur in unberührte Zellen gegraben, es entsteht also keine Abkürzung.
5. **Abspielen:** Der Lichtpunkt läuft die Route ab und hinterlässt die Leuchtspur;
   danach Seitenwechsel und weiter mit der nächsten Seite.

Der Text bestimmt den Mittelteil jeder Route, der Seed alles andere. Alle Seiten kommen
aus demselben Zufallsgenerator: gleicher Seed → gleiche Seitenfolge.

## Seitenwechsel

```
Seite 1                         Seite 2
+----------------------+        +----------------------+
|                      |        |                      |
|   T E X T ...     ---->  schiebt nach links  ---->   ... T E X T
|                      |        |                      |
+----------------------+        +----------------------+
Ausgang rechts, Zeile 7         Eingang links, Zeile 7
```

- Ausgang rechts → Eingang der nächsten Seite links in **derselben Zeile**.
- Ausgang oben → Eingang der nächsten Seite unten in **derselben Spalte** (und umgekehrt).
- Beim Schieben liegen beide Seiten genau eine Labyrinth-Breite bzw. -Höhe auseinander.
  Ihre Außenwände fallen dadurch aufeinander, und die Lücke des Ausgangs trifft die Lücke
  des Eingangs.

Die Animation durchläuft je Seite diese Abschnitte (`scene.phase`):

| Abschnitt | Was passiert | Ende |
|---|---|---|
| `WRITING` | Der Lichtpunkt läuft die Route der Seite ab. | Punkt ist draußen |
| `FADING` | Kein Punkt mehr, die Spur verglimmt. | nach „leuchtet voll" + „blendet aus" Sekunden |
| `SCROLLING` | Alte Seite schiebt hinaus, neue herein. | nach „Dauer des Seitenwechsels" |
| `FINISHED` | Nur nach der letzten Seite: es bewegt sich nichts mehr. | – |

## Reviere

Damit sich die drei Routenteile nicht kreuzen, hat jeder sein eigenes Gebiet:

```
+-------------------+---------------+
|  Anlauf           |      Ablauf   |   Streifen über dem Text
|      +---------------------+      |
|    T |       T E X T       | T    |   links vom Text: Anlauf, rechts: Ablauf
|      +---------------------+      |
|  Anlauf                |  Ablauf  |   Streifen unter dem Text
+------------------------+----------+
T = Tor: hier übergibt der Anlauf an den Text bzw. der Text an den Ablauf
```

Das Text-Revier ist der Textblock plus je eine Spalte Rand links und rechts;
in diesen Randspalten laufen die Zeilenwechsel.

**Neu:** Die Streifen über und unter dem Text haben je eine eigene **Trennspalte**
(`dividingColumn`). Normalerweise ist das die Mitte (wie in Prototyp 2). Liegt der Eingang
an diesem Rand rechts der Mitte, rückt die Trennspalte nach rechts, bis der Eingang im
Anlauf-Revier liegt. Liegt der Ausgang dort, rückt sie nötigenfalls nach links.

Warum das immer aufgeht:

- Um den Text bleibt ringsum Platz frei (`FREE_COLS_BESIDE_TEXT`, `FREE_ROWS_AROUND_TEXT`),
  die Streifen über und unter dem Text gibt es also immer.
- Das Anlauf-Revier hängt über die Spalte ganz links zusammen, das Ablauf-Revier über die
  Spalte ganz rechts. In einem zusammenhängenden Revier findet `findWindingPath` immer einen Weg.
- Die Reviere überschneiden sich nicht, also können sich Anlauf und Ablauf nicht kreuzen.
- Ausgänge oben/unten liegen nie in den Eckspalten und – falls der Eingang am selben Rand
  liegt – immer rechts vom Eingang (`exitColumnRange`). Deshalb gibt es für jede Trennspalte
  einen gültigen Wert.

**Kompromisse dabei:**

- Liegen Ein- und Ausgang am selben Rand (z. B. beide unten), muss der Ausgang rechts vom
  Eingang liegen. Ist dort kein Platz (Eingang in der vorletzten Spalte), wird dieser Rand
  als Ausgang übergangen. Bei „zufällig" fällt die Wahl dann auf einen der anderen Ränder;
  bei fest gewähltem Ausgangsrand kann der Fall nicht eintreten (die Folgeseite betritt man
  dann ja immer am gegenüberliegenden Rand).
- Auf einer vollen Seite sind die Streifen über und unter dem Text nur zwei Zeilen hoch.
  Kommt der Punkt rechts unten herein, läuft er deshalb recht gerade unter dem ganzen Text
  entlang nach links – für Windungen ist dort kaum Platz.
- Der Lichtpunkt verlässt eine Seite nie nach links (wie in Prototyp 2), der Eingang einer
  Seite liegt also nie rechts.
- Durch die frei gehaltenen Ränder passt etwas weniger Text auf eine Seite als in Prototyp 2
  (je Zeile bis zu ein Zeichen, je Seite bis zu eine Zeile weniger).

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

## Kurzlebige Leuchtspur

Für jeden gelaufenen Schritt wird die Uhrzeit gemerkt (`scene.walkedAt`). Ab dann:

1. „Leuchtet voll für" Sekunden lang volle Helligkeit (Standard 0,8 s),
2. danach fällt die Helligkeit über „Blendet danach aus innerhalb von" Sekunden
   (Standard 0,8 s) linear auf die „Rest-Helligkeit" (Standard 0 % = ganz weg).

Bei Tempo 40 Zellen/s braucht ein Buchstabe etwa eine halbe Sekunde. Mit den
Standardwerten ist der gerade fertige Buchstabe also noch vollständig hell, der davor
blendet aus, ältere sind verschwunden. Rest-Helligkeit 100 % lässt den Text stehen
(er wandert dann beim Seitenwechsel mit der alten Seite hinaus).

Die Spur wird in 16 Helligkeitsstufen gezeichnet, je Stufe in einem Rutsch. Damit sich
Wegstücke verschiedener Stufen nicht überlappen (das gäbe dunklere Knoten), wird jedes
Stück mit stumpfen Enden um eine halbe Spurbreite gegen die Laufrichtung versetzt
gezeichnet – so schließen die Stücke auch um die Ecke lückenlos aneinander an.

## Plastische Wände

Die Wände einer Seite werden **einmal** auf ein unsichtbares Canvas gezeichnet
(`renderWallImage`) und pro Bild nur noch kopiert (`drawWalls`). Ein Schatten über
tausende Wandstücke 60-mal pro Sekunde wäre zu teuer. Das Wandbild wird neu gezeichnet,
wenn ein Wand-Regler bewegt wird (`wallLookOf` erkennt das), und für jede neue Seite.

Schichten des Wandbilds, von unten nach oben:

1. Wand in voller Stärke mit Schlagschatten nach rechts unten
2. dieselbe Wand in Weiß, etwas nach links oben versetzt → helle Kante
3. dieselbe Wand in Schwarz, etwas nach rechts unten versetzt → dunkle Kante
4. die Wand etwas schmaler in ihrer Farbe → deckt alles zu bis auf die beiden Kanten

Das Licht kommt fest von links oben.

## schrift.js

Unverändert gegenüber Prototyp 2.

| Name | Was es tut |
|---|---|
| `GLYPHS` | Pro Zeichen die Liste der Wegpunkte `[x, y]` (oder `[x, y, DOT]`) im 3×5-Kästchen. Der Punkt läuft sie der Reihe nach geradlinig ab. Erster und letzter Wegpunkt liegen in der untersten Zeile. |
| `normalizeText(text)` | Wandelt die Eingabe in darstellbaren Text: Großbuchstaben, ß wird SS, unbekannte Zeichen entfernt, Mehrfach-Leerzeichen zusammengefasst. Umlaute bleiben. |
| `wrapText(text, maxCharsPerLine)` | Bricht an Wortgrenzen in Zeilen um. Zu lange Wörter werden hart zerteilt. |

## labyrinth.js

| Name | Was es tut |
|---|---|
| `OUTWARD` | Pro Rand die Richtung, die aus dem Raster hinausführt. |
| `OPPOSITE_SIDE` | Pro Rand der gegenüberliegende Rand. **Neu.** |
| `FREE_COLS_BESIDE_TEXT`, `FREE_ROWS_AROUND_TEXT` | Wie viele Spalten neben und Zeilen über/unter dem Textblock mindestens frei bleiben. **Neu.** |
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
| `textCapacity(cols, rows, maxLinesPerPage)` | Rechnet aus, wie viele Zeichen in eine Zeile und wie viele Zeilen auf eine Seite passen (abzüglich der frei gehaltenen Ränder, höchstens `maxLinesPerPage`). **Neu.** |
| `splitIntoPages(lines, linesPerPage)` | Teilt die Zeilenliste in Seiten zu je höchstens `linesPerPage` Zeilen. Leerer Text ergibt eine Seite mit einer leeren Zeile. **Neu.** |
| `layoutTextBlock(lines, cols, rows)` | Berechnet die zentrierte Lage des Textblocks (äußerste Zellen links/rechts/oben/unten). |
| `walkTo(route, x, y, kind)` | Verlängert die Route in gerader Linie bis zur Zielzelle, eine Zelle pro Schritt, mit der angegebenen Art. |
| `appendGlyph(route, waypoints, glyphLeft, glyphTop)` | Hängt den Weg durch einen Buchstaben an und vergibt dabei die Arten (Einstieg = Verbinder, Umlaut-Hüpfer = ohne Spur, sonst Buchstabe). |
| `appendTextRoute(route, lines, cols, block)` | Hängt den Weg durch den ganzen Text einer Seite an: vom linken Tor über alle Zeilen zum rechten Tor. |
| `pickBorderCell(side, cols, rows, columnRange, random)` | Wählt eine zufällige Zelle am gewünschten Rand; oben/unten nur im angegebenen Spaltenbereich. |
| `cellOutside(borderCell, side, distance)` | Die Zelle, die so viele Schritte außerhalb vor einer Randzelle liegt. |
| `pickFirstEntrance(sideWish, cols, rows, random)` | Wählt Rand und Zelle für den Eingang der ersten Seite: links, oben oder unten (oben/unten in der linken Hälfte, nicht in der Eckspalte). Gibt `{ cell, side }` zurück. **Neu.** |
| `entranceOppositeOf(exit, cols, rows)` | Der Eingang einer Folgeseite: gegenüberliegender Rand, gleiche Zeile bzw. Spalte wie der Ausgang der vorigen Seite. **Neu.** |
| `exitColumnRange(side, entrance, cols)` | In welchen Spalten ein Ausgang oben/unten liegen darf: rechte Hälfte ohne Eckspalte, und rechts vom Eingang, falls der am selben Rand liegt. `min > max` heißt: kein Platz. **Neu.** |
| `pickExit(sideWish, entrance, cols, rows, random)` | Wählt Rand und Zelle des Ausgangs. Übergeht Ränder ohne Platz; rechts geht immer. Gibt `{ cell, side }` zurück. **Neu.** |
| `dividingColumn(side, entrance, exit, cols)` | Die Trennspalte im Streifen über (`"top"`) bzw. unter (`"bottom"`) dem Text: links davon Anlauf, ab ihr Ablauf. Mitte, außer Eingang oder Ausgang an diesem Rand zwingen sie zur Seite. **Neu.** |
| `createTerritories(block, cols, entrance, exit)` | Teilt alle Zellen in die drei Reviere und gibt die Prüf-Funktionen `isText`, `isApproach`, `isLeave` zurück. **Neu.** |
| `buildRoute(lines, cols, rows, entrance, exit, random, detour)` | Baut die ganze Route einer Seite: von außen herein, Anlauf, Text, Ablauf, hinaus. Ein- und Ausgang werden jetzt übergeben statt hier gewählt. Gibt die Route zurück. **Geändert.** |
| `carveRoute(maze, route)` | Bricht entlang der Route die Wände heraus (Schritte außerhalb des Rasters werden übersprungen). |
| `generatePage(lines, cols, rows, entrance, random, options)` | Erzeugt eine Seite: Ausgang wählen, Route bauen, freibrechen, Rest wachsen lassen. Gibt `{ maze, route, entrance, exit, lines }` zurück. **Neu.** |
| `generateMessagePages(text, cols, rows, seed, options)` | Der Einstieg (ersetzt `generateMessageMaze`): Text aufbereiten, umbrechen, auf Seiten verteilen und für jede Seite ein Labyrinth erzeugen, dessen Eingang dem Ausgang der vorigen Seite gegenüberliegt. Gibt die Liste der Seiten zurück. **Neu.** |

## seite.js

| Name | Was es tut |
|---|---|
| `WRITING`, `FADING`, `SCROLLING`, `FINISHED` | Die Abschnitte der Animation (siehe „Seitenwechsel"). **Neu.** |
| `scene` | Der Zustand zwischen zwei Bildern: alle Seiten, aktuelle Seite, Abschnitt und sein Beginn, Fortschritt, Uhr, Laufzeiten der Schritte, aufgehobene Wandbilder. |
| `THEMES` | Die beiden Farbschemata (hell, dunkel) – jetzt mit grauen Wänden, blauer Spur, Schattenfarbe und Schattenstärke. |
| `readSettings()` | Liest alle Regler in ein Objekt. |
| `applyTheme(theme)` | Stellt die Farb-Regler auf ein Farbschema. |
| `fitCanvasToStage()` | Passt die Pixelzahl des Canvas an Anzeigegröße und Bildschirmauflösung an. |
| `currentPage()` | Die Seite, auf der der Lichtpunkt gerade unterwegs ist. **Neu.** |
| `hasNextPage()` | Kommt nach der aktuellen Seite noch eine? **Neu.** |
| `enterPhase(phase)` | Beginnt einen Abschnitt der Animation und merkt sich den Stand der Uhr. **Neu.** |
| `startPage(pageIndex)` | Setzt den Lichtpunkt an den Anfang der Seite, vergisst die Spur, beginnt mit `WRITING`, räumt alte Wandbilder weg und zeigt „Seite x von y". **Neu.** |
| `restartAnimation()` | „Nochmal abspielen": beginnt wieder bei Seite 1. |
| `regenerate()` | Berechnet das Raster aus Fenster- und Zellgröße, erzeugt alle Seiten neu, startet die Animation von vorn und schreibt die Status-Zeile. |
| `showPageStatus()` | Schreibt „Seite x von y" in die Anzeige. **Neu.** |
| `centerOf(cell)` | Rechnet eine Zelle in den Canvas-Punkt ihrer Mitte um. |
| `positionAt(progress)` | Wo auf der Route der aktuellen Seite der Punkt nach `progress` Schritten steht – auch zwischen zwei Zellen. |
| `advanceDot(steps)` | Bewegt den Lichtpunkt weiter und merkt sich für jeden fertig gelaufenen Schritt die Uhrzeit. |
| `trailLifetime(settings)` | Wie lange ein Wegstück insgesamt zu sehen ist: volle Leuchtdauer + Ausblenddauer. **Neu.** |
| `stepAnimation(seconds, settings)` | Stellt die Uhr weiter und führt die Animation fort: Punkt bewegen, bei Bedarf in den nächsten Abschnitt bzw. auf die nächste Seite wechseln. **Neu.** |
| `easeInOut(part)` | Sanftes Anfahren und Abbremsen für den Seitenwechsel (bildet 0..1 auf 0..1 ab). **Neu.** |
| `scrollShifts(settings)` | Um wie viele Pixel die alte (`outgoing`) und die neue Seite (`incoming`) gerade verschoben sind. Außerhalb des Seitenwechsels ist die alte Seite unverschoben. **Neu.** |
| `traceWalls(context, page)` | Legt alle Wände einer Seite als Linien in den Pfad eines Canvas, mit Lücken an Eingang und Ausgang (egal an welchem Rand). Zeichnet selbst noch nichts. |
| `strokeWalls(context, page, color, lineWidth, opacity, shift)` | Zeichnet alle Wände einer Seite in einer Farbe, Stärke und Deckkraft, um `shift` Pixel schräg versetzt. **Neu.** |
| `strokeWallsWithShadow(context, page, settings, pixelRatio)` | Zeichnet die Wände samt Schlagschatten nach rechts unten. **Neu.** |
| `wallLookOf(settings)` | Fasst alles, was das Aussehen der Wände bestimmt, zu einem Text zusammen. Ändert er sich, ist das aufgehobene Wandbild veraltet. **Neu.** |
| `renderWallImage(page, settings)` | Zeichnet die Wände einer Seite in vier Schichten (Schatten, helle Kante, dunkle Kante, Wandkörper) auf ein eigenes, unsichtbares Canvas. Gibt Bild, Rand (`padding`), Größe und Aussehen zurück. **Neu.** |
| `wallImageOf(pageIndex, settings)` | Liefert das fertige Wandbild einer Seite; zeichnet es nur neu, wenn es fehlt oder veraltet ist. **Neu.** |
| `prepareNextWallImage(settings)` | Zeichnet das Wandbild der nächsten Seite schon, sobald der Punkt die aktuelle verlassen hat – damit der Seitenwechsel nicht mit einem Ruckler beginnt. **Neu.** |
| `forgetUnneededWallImages()` | Wirft Wandbilder von Seiten weg, die weder aktuell noch als nächste dran sind (spart Speicher). **Neu.** |
| `drawWalls(pageIndex, settings)` | Kopiert das fertige Wandbild einer Seite auf das sichtbare Canvas. |
| `brightnessLevelOf(step, settings)` | Wie hell ein gelaufener Schritt noch leuchtet, als Stufe 0–16: erst voll, dann linear bis zur Rest-Helligkeit. |
| `strokeWalkedSegments(kind, level, levelOfStep, settings)` | Zeichnet die gelaufenen Wegstücke einer Art und einer Helligkeitsstufe in einem Rutsch, jedes um eine halbe Spurbreite nach hinten versetzt (keine Überlappung). |
| `fillUmlautDots(level, levelOfStep, settings)` | Zeichnet die schon besuchten Umlaut-Punkte einer Helligkeitsstufe. |
| `drawTrail(settings)` | Zeichnet die Spur: erst blass die Verbinder, darüber die Buchstaben und Punkte, jeweils Stufe für Stufe. |
| `drawPlannedPath(settings)` | Zeichnet gestrichelt den Weg, der auf dieser Seite noch vor dem Punkt liegt (abschaltbar). |
| `drawDot(settings)` | Zeichnet den Lichtpunkt: innen weiß, außen in seiner Farbe, mit Leuchten. |
| `drawTrailAndDot(settings)` | Zeichnet Spur und (nur während `WRITING`) Lichtpunkt, beschnitten auf die Labyrinth-Fläche – so taucht der Punkt am Eingang auf und verschwindet am Ausgang. **Neu.** |
| `drawPage(pageIndex, shift, settings)` | Zeichnet eine Seite um `shift` Pixel verschoben: Wände und – auf der aktuellen Seite – Spur und Punkt. **Neu.** |
| `drawScene(settings)` | Ein komplettes Bild: Hintergrund, aktuelle Seite und während des Seitenwechsels zusätzlich die nächste. |
| `onAnimationFrame(now)` | Läuft pro Bildschirm-Bild: misst die vergangene Zeit, ruft `stepAnimation` und zeichnet neu, solange die Animation läuft oder ein Regler etwas geändert hat. |
| `showSliderValues()` | Schreibt neben jeden Schieberegler seinen Wert. |
| `connectControls()` | Verbindet Regler und Knöpfe mit ihren Aktionen. „Diese Seite überspringen" lässt den Punkt sofort am Ende der Seite ankommen. |

## Bekannte Schwächen

- Die Buchstaben-Gänge sind schon vor dem Lauf in den Wänden zu erahnen (auffällig gerade
  Gänge). Durch dicke Wände und Schatten fällt das **stärker** auf als in Prototyp 2 –
  und weil die Spur jetzt verglimmt, ist das Wandmuster das Einzige, was stehen bleibt.
- Beim Seitenwechsel liegen die Außenwände beider Seiten aufeinander; an dieser Naht ist
  der Schatten doppelt und damit etwas dunkler.
- Nach einem Seitenwechsel nach oben/unten läuft der Anlauf auf vollen Seiten recht gerade
  am Text vorbei (siehe „Kompromisse").
- „Diese Seite überspringen" lässt den ganzen Rest der Seite kurz gleichzeitig aufleuchten.
- Wird ein zu langes Wort hart zerteilt, kann die Trennung auch über einen Seitenwechsel fallen.
- Schrägen gibt es nicht: N und V sind Notlösungen, 0/O, 2/Z und 5/S sehen gleich aus.
- Wird ein Stück doppelt gelaufen (z. B. der Balken beim H), liegt die Spur dort zweimal
  übereinander und ist während des Ausblendens etwas kräftiger als der Rest.
- Das Licht kommt fest von links oben; die Richtung ist nicht einstellbar.
- Ändert sich die Fenstergröße, beginnt die Animation von vorn bei Seite 1.
