# Labyrinth-Prototyp 6 „Frage und Antwort"

Wegwerf-Prototyp, aufbauend auf `../05-gruener-monitor`. Alles von dort ist erhalten
(grüner Monitor, Überstrahlen, Zeilenraster, Bildstörungen, kurzlebige rote Spur, mehrere
Seiten mit Weiterschieben, Trennstrich, Umlaute, Fragezeichen, zwei Geschwindigkeiten).

**Wichtigster Zweck: auf dem Handy ausprobieren.** Geprüft ist bisher nur am Rechner, in
einem nachgeahmten Handy – siehe „Was geprüft ist und was nicht".

Öffnen: `index.html` direkt im Browser (kein Server, kein Build nötig).
Fürs Handy: `einzeldatei/labyrinth-prototyp-6.html` (siehe „Einzeldatei fürs Handy").
Für christianhoerauf.de: `../../live/index.html` (siehe „Besucherfassung").

## Neu gegenüber Prototyp 5

- **Frage-Antwort-Ablauf.** Unter dem Labyrinth liegt ein Fragefeld. Beim Laden schreibt der
  Lichtpunkt eine Begrüßung; auf jede Frage wird eine Antwort aus einer festen
  Platzhalter-Tabelle gewählt und im Labyrinth geschrieben. Das Text-Feld aus Prototyp 5
  ist entfallen: Beginnt die Frage mit `=`, wird der Rest wörtlich geschrieben.
- **Übergang zur nächsten Antwort.** Das Bild schiebt in die Richtung weiter, in die der
  Lichtpunkt verschwunden ist; der Punkt kommt im neuen Labyrinth am gegenüberliegenden
  Rand wieder herein. Das ist derselbe Seitenwechsel wie zwischen den Seiten einer Antwort.
- **Zeilenwechsel ohne lange gerade Gänge.** Der Rückweg zum Zeilenanfang windet sich durch
  ein Band zwischen den Zeilen, und lange gerade Wände an Verbindungsspur und Rückweg
  werden unterbrochen.
- **Config und Geräteprofile** in `config.js`: Grundwerte plus Profile `desktop` und `handy`.
  Die Regler starten mit den Werten des aktiven Profils; ein Knopf gibt die aktuellen
  Reglerwerte als fertigen Config-Text aus.
- **Handy-Layout**: Labyrinth über die ganze Breite, Fragefeld darunter, Regler eingeklappt.
  Die Bildschirmtastatur löst keinen Neuaufbau mehr aus.
- **Anzeige „Bilder pro Sekunde"** oben in der Regler-Leiste.
- **Feste Spaltenzahl** als Alternative zur Zellgröße (das Handy-Profil nutzt 34 Spalten).
- **Schalter „Antwort am Ende zusätzlich als Text zeigen"** (Standard: aus).
- **Besucherfassung** für die echte Webseite: dieselbe Quelle, über eine zweite kleine
  Config-Datei ohne Regler und mit festen Texten gebaut (siehe „Besucherfassung").
- **Satzpunkt** als neues Zeichen und **Trennstellen-Zeichen** `|` für lange Wörter.
- **Knopf „Nochmal"** neben dem Fragefeld (per Config; in der Besucherfassung an).
- Kleinigkeiten: Die Reglerwerte werden nicht mehr in jedem Bild neu gelesen; von der Spur
  wird nur noch der Teil betrachtet, der noch leuchtet; das Leuchten von Spur und Punkt
  rechnet jetzt wie das Überstrahlen der Wände in Pixeln der Seite statt in Geräte-Pixeln
  (auf hochauflösenden Bildschirmen wirkt es dadurch etwas kräftiger als in Prototyp 5).

## Die Dateien

| Datei | Inhalt |
|---|---|
| `config.js` | Antwort-Tabelle (Platzhalter), Grundwerte, Geräteprofile. **Hier ändert Christian Werte.** |
| `schrift.js` | Die Buchstaben als Wege, Textumbruch. |
| `labyrinth.js` | Route und Labyrinth einer Seite, Seitenfolge einer Antwort. Kennt keinen Browser. |
| `antworten.js` | Wählt zu einer Frage die Antwort aus der Tabelle. Kennt keinen Browser. |
| `einstellungen.js` | Profil wählen, Regler füllen und auslesen, Config-Text erzeugen. |
| `seite.js` | Fragefeld, Ablauf der Animation, Zeichnen, Fenstergröße, Regler-Leiste. |
| `index.html` | Aufbau der Seite, Aussehen, alle Regler. |
| `besucher/config-besucher.js` | Die Abweichungen der Besucherfassung: Texte, keine Regler, keine Testhilfe. |
| `besucher/kopf.html` | Titel und Beschreibung der Besucherfassung. |
| `besucher/inhalt.html` | Einstiegstext für Screenreader und Suchmaschinen, `noscript`-Hinweis. |
| `baue-einzeldatei.sh` | Baut beide Einzeldateien: den Prototyp mit Reglern und die Besucherfassung. |
| `tests/` | Automatische Tests mit Node (siehe „Tests"). Werden nicht in die Einzeldateien eingebaut. |
| `werkzeuge/screenshots.js` | Screenshots der Besucherfassung für mehrere Startwerte, Handy und Desktop (siehe „Screenshots mehrerer Startwerte"). |

Die Skripte werden in genau dieser Reihenfolge geladen; jedes benutzt nur, was davor steht.

## Frage und Antwort

1. Beim Laden schreibt der Lichtpunkt `CONFIG.greeting`.
2. Enter oder „Senden" schickt die Frage ab. `findAnswer` wählt den Antworttext:
   - Beginnt die Eingabe mit `=`: der Rest, wörtlich (Testhilfe für beliebige Texte;
     nur wenn `CONFIG.allowLiteralAnswers` an ist).
   - Sonst der erste Eintrag der Tabelle `CONFIG.answers`, von dem ein Stichwort als
     ganzes Wort (oder ganze Wortfolge) in der Frage vorkommt. Groß-/Kleinschreibung und
     Satzzeichen sind egal. „hi" passt deshalb nicht auf „Schiff".
   - Passt nichts: `CONFIG.unknownAnswer` („WEISS ICH NICHT").
3. `showAnswer` erzeugt die Seiten der neuen Antwort so, dass der Eingang der ersten Seite
   dem Ausgang des aktuellen Labyrinths genau gegenüberliegt, und hängt sie an. Danach
   läuft der gewohnte Seitenwechsel.

**Die Antwort-Tabelle ist ein Platzhalter.** Sie enthält bewusst keine Angaben über
Christians Lebenslauf. Später tritt an die Stelle von `findAnswer` der Aufruf des
Sprachmodells.

**Jede Antwort bekommt ein anderes Labyrinth**, auch bei gleichem Text: ihr Startwert ist
der Zufalls-Startwert aus dem Regler plus die laufende Nummer der Antwort.

**Ein Labyrinth 1:1 wieder aufrufen:** `?seed=123` in der Adresse setzt den
Zufalls-Startwert, auch in der Besucherfassung ohne Regler (z. B.
`christianhoerauf.de/?seed=123`, kombinierbar mit `&profil=handy`). Ohne Parameter gilt der
Wert aus der Config (1). Genau dasselbe Bild ergibt sich nur, wenn alles andere auch gleich
ist: Rastergröße (also Fenstergröße und Profil), Text, Einstellungen und – ab der zweiten
Antwort – die Folge der Antworten davor, denn der Eingang hängt am Ausgang des vorigen
Labyrinths. Die Begrüßung bekommt den Startwert selbst, die erste Antwort Startwert + 1 usw.

### Knopf „Nochmal"

Steht neben „Senden", wenn `CONFIG.showReplayButton` an ist (im Prototyp aus, weil die
Regler-Leiste schon „Antwort nochmal abspielen" hat und am Handy sonst kaum Platz für das
Fragefeld bleibt; in der Besucherfassung an). Er schreibt das zuletzt Geschriebene noch
einmal: die Begrüßung, solange keine Frage gestellt wurde, danach die letzte Antwort.

Entscheidung: Der Text wird dabei **wie eine neue Antwort** behandelt (`replayLastAnswer`
ruft `showAnswer`). Das Bild schiebt also weiter zu einem frischen Labyrinth, in dem der
Text von vorn geschrieben wird. Wird noch geschrieben, gilt dasselbe wie bei einer neuen
Frage (nächster Abschnitt): Rest im Schnelldurchlauf, weiterschieben, dann von vorn.
So gibt es für Besucher nie einen harten Schnitt. „Antwort nochmal abspielen" in der
Regler-Leiste baut dagegen dasselbe Labyrinth sofort neu auf (und passt es dabei an die
Bühne an).

### Frage, während noch geschrieben wird

Entscheidung: Die neue Frage hat Vorrang, aber das Bild springt nie.

- Seiten der alten Antwort, die noch gar nicht zu sehen sind, entfallen.
- Die sichtbare Seite läuft der Punkt im **Schnelldurchlauf** zu Ende (Regler „Rest so viel
  mal schneller", Standard 6-fach). Der Rest des Textes blitzt dabei kurz auf.
- Danach wird **ohne Warten** weitergeschoben; die Spur verglimmt während des Schiebens.
- Rollt gerade schon die nächste Seite der alten Antwort herein, wird auch sie noch
  durcheilt – sonst müsste das Bild mitten im Schieben springen.
- Kommen mehrere Fragen kurz hintereinander, gewinnt die letzte; von den übersprungenen
  bleibt nichts übrig.

In der Regler-Leiste steht dann „Seite x von y (alte Antwort im Schnelldurchlauf)".

### Abschnitte der Animation (`scene.phase`)

| Abschnitt | Was passiert | Ende |
|---|---|---|
| `WRITING` | Der Lichtpunkt läuft die Route der Seite ab. | Punkt ist draußen |
| `FADING` | Kein Punkt mehr, die Spur verglimmt. | nach „leuchtet voll" + „blendet aus" Sekunden; bei einer überholten Antwort sofort |
| `SCROLLING` | Alte Seite schiebt hinaus, neue herein. | nach „Dauer des Weiterschiebens" |
| `FINISHED` | Antwort fertig. Es bewegt sich nichts, bis die nächste Frage kommt. | `showAnswer` hängt neue Seiten an und beginnt `SCROLLING` |

`scene.pages` enthält immer nur die Seiten ab der aktuellen. Bei jeder Frage werden die
erledigten vorn abgeschnitten, die Liste wächst also nicht mit der Zahl der Fragen.

## Zeilenwechsel ohne lange gerade Gänge

In Prototyp 5 lief der Rückweg unter jeder Textzeile schnurgerade nach links, darüber lag
die ebenfalls gerade Verbindungsspur. Im Wandmuster waren das zwei lange parallele Linien
quer über die Seite – sie verrieten jede Textzeile.

Zwei Maßnahmen, beide nötig:

1. **Band statt Zeile.** Unter jeder Textzeile liegt ein Band (Standard 2 Rasterzeilen
   hoch). Der Rückweg windet sich darin von rechts nach links (`appendLineChange` nutzt
   `findWindingPath`, beschränkt auf das Band). Was er vom Band nicht braucht, füllt
   `growMaze` mit gewöhnlichen Gängen.
2. **Lange Wände unterbrechen.** Die Verbindungsspur selbst bleibt gerade – die Buchstaben
   stehen nun einmal auf einer Linie. Ihre untere Wand wäre weiterhin eine durchgehende
   Linie. `breakUpLongWalls` setzt deshalb in die waagrechten Wände an Verbindungsspur und
   Rückweg nach jeweils 2 bis 4 Zellen (gewürfelt) eine Lücke.

```
5 Zeilen   Buchstaben (je 3 Zellen breit, 1 Zelle Abstand)
1 Zeile    Verbindungsspur: von Buchstabe zu Buchstabe
2 Zeilen   Band: hier windet sich der Rückweg zum Anfang der nächsten Textzeile
```

**Kosten**, gemessen am Standardtext von Prototyp 5 (50 Zeichen), Mittel über 40 Startwerte:

| | Prototyp 5 | Standard jetzt (Band 2) | Band 3 |
|---|---|---|---|
| Rasterzeilen je Textzeile | 7 | 8 | 9 |
| Textzeilen je Seite, Laptop (54 × 26 Zellen) | 3 | 3 | 2 |
| Textzeilen je Seite, Handy (34 × 54 Zellen) | 7 | 6 | 5 |
| Textzeilen je Seite, Handy (34 × 70 Zellen) | 9 | 8 | 7 |
| reine Laufzeit | 15,7 s | 16,0 s | 16,3 s |
| längste waagrechte Wand im Inneren (Laptop) | 34 Zellen | 9,5 Zellen | 9,3 Zellen |
| Rundwege je Seite | 8 | rund 24 | 12 bis 19 |

- **Platz:** eine Rasterzeile mehr je Textzeile. Auf dem Laptop passen gleich viele Zeilen
  auf die Seite, auf dem Handy meist eine weniger.
- **Laufzeit:** rund 2 % länger – der gewundene Rückweg ist kaum länger als der gerade.
- **Rundwege:** Liegt hinter einer Lücke ein anderes Stück der Route (z. B. der Rückweg
  direkt unter der Verbindungsspur), entsteht ein Rundweg. Das Labyrinth hat dadurch je
  Seite rund 15 Abkürzungen mehr. Der Lichtpunkt läuft trotzdem seine feste Route; und
  Buchstaben wie O oder A bilden ohnehin Rundwege (das sind die 8 in der Spalte „Prototyp 5").

Zum Vergleichen in der Regler-Leiste unter „Zeilenwechsel":
Band 1 und „Gerade Wand … höchstens" 0 ergibt das Verhalten von Prototyp 5. Band 1 mit
unterbrochenen Wänden kostet keinen Platz, sieht aber nach gestrichelten Linien aus.

Die Route ist weiterhin lückenlos und kreuzt sich nicht: Das Band liegt vollständig im
Text-Revier, jedes Band gehört genau einem Zeilenwechsel.

## Reviere

Unverändert aus Prototyp 5. Damit sich die drei Routenteile nicht kreuzen, hat jeder sein
eigenes Gebiet:

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

Das Text-Revier ist der Textblock plus je eine Spalte Rand links und rechts. Darin liegen
die Buchstaben, die Verbindungsspuren und die Bänder für die Zeilenwechsel.

Die Streifen über und unter dem Text haben je eine eigene Trennspalte (`dividingColumn`):
normalerweise die Mitte; liegt der Eingang an diesem Rand rechts der Mitte, rückt sie nach
rechts, liegt der Ausgang dort, nötigenfalls nach links. Deshalb findet auch die erste
Seite einer neuen Antwort immer ihren Weg, egal wo die vorige aufgehört hat.

Kompromisse (wie in Prototyp 5): Liegen Ein- und Ausgang am selben Rand, muss der Ausgang
rechts vom Eingang liegen. Der Lichtpunkt verlässt eine Seite nie nach links. Auf vollen
Seiten sind die Streifen über und unter dem Text nur zwei Zeilen hoch, der An- oder Ablauf
läuft dort recht gerade.

## Arten von Wegstücken

| Art | Bedeutung | Spur |
|---|---|---|
| `LETTER` | gehört zu einem Buchstaben | kräftig, leuchtend |
| `CONNECTOR` | An-/Ablauf, Verbindungsspur, Zeilenwechsel | blass (Regler) |
| `SILENT` | Hüpfer zu Umlaut-Punkt, Trennstrich, Fragezeichen | keine |

Umlaute, Trennstrich und Fragezeichen funktionieren wie in Prototyp 5 (`DOT` = ohne Spur
hin, Punkt hinterlassen, ohne Spur zurück; `HOP` = ohne Spur hin).

**Satzpunkt (neu).** Der Punkt `.` ist ein einzelner `DOT` links in der untersten Zeile des
Kästchens: Der Lichtpunkt hüpft ohne Spur aus der Verbindungsspur hinauf und hinterlässt
einen Punkt. Er belegt wie jedes Zeichen vier Spalten und zählt beim Umbruch als Zeichen.

## Trennstellen-Zeichen

Am Handy passen 7 Zeichen in eine Zeile; die Trennung nach Platz ergibt Unschönes wie
„INTERN-ETPRÄS-ENZ". Deshalb darf in jedem Text ein `|` stehen: Es markiert, wo ein Wort
getrennt werden darf, und wird nie angezeigt.

- Getrennt wird nur ein Wort, das **nicht in eine Zeile passt**. Wörter, die hineinpassen,
  bleiben ganz, egal wie viele `|` sie enthalten.
- Genommen wird die **späteste** markierte Stelle, bei der das Stück samt Trennstrich noch
  in die Zeile passt. `INTER|NET|PRÄ|SENZ` wird bei 7 Zeichen zu `INTER-` / `NETPRÄ-` /
  `SENZ`, bei 12 Zeichen zu `INTERNETPRÄ-` / `SENZ`.
- Passt keine markierte Stelle, gilt für dieses Stück die alte Trennung nach Platz.
- Ein getrenntes Wort beginnt wie bisher in einer neuen Zeile.
- Das Zeichen gilt überall, auch in der Testhilfe: `=INTER|NET|PRÄ|SENZ`.

## Config und Geräteprofile

`config.js` enthält ein einziges Objekt `CONFIG`:

| Teil | Bedeutung |
|---|---|
| `desktopFromWidth` | Ab dieser Fensterbreite gilt das Profil `desktop`, darunter `handy`. |
| `showControls` | Gibt es den Knopf „Regler" und die Regler-Leiste? |
| `showReplayButton` | Gibt es den Knopf „Nochmal" neben dem Fragefeld? |
| `allowLiteralAnswers` | Gilt die Testhilfe `=TEXT`? |
| `greeting`, `unknownAnswer`, `answers` | Die Platzhalter-Antworten. Texte dürfen `\|` als Trennstelle enthalten. |
| `base` | Die Grundwerte aller Regler. Jeder Name ist zugleich die `id` des Reglers in `index.html`. |
| `profiles.desktop`, `profiles.handy` | Je Profil nur die Werte, die von `base` abweichen. |

- Die Einheiten sind die der Regler. Prozentwerte stehen als 0 bis 100 da.
- `controlsOpen` ist der einzige Name ohne Regler: Ist die Regler-Leiste beim Laden offen?
- **Gewählt wird das Profil einmal beim Laden** nach `window.innerWidth`. Danach ändert es
  sich nicht von selbst (sonst gingen verstellte Regler beim Drehen des Handys verloren).
- Von Hand wechseln: Auswahl „Regler füllen mit den Werten von" in der Regler-Leiste.
- Erzwingen: `index.html?profil=handy` (zum Ausprobieren am Rechner).
- Startwert festlegen: `index.html?seed=123` gilt statt `seed` aus dem Profil, auch nach
  einem Profilwechsel von Hand.
- Das Profil bestimmt auch das Layout (`body[data-profile="handy"]` in `index.html`).
  Ein weiteres Profil bekäme das Desktop-Layout.

**Werte vom Handy zurückholen:** Regler-Leiste → „Aktuelle Werte als Config anzeigen und
kopieren". Es erscheint ein Textfeld mit dem fertigen Block für das aktive Profil, etwa

```
    // Reglerwerte vom 11.10.2026, Fenster 390 × 844 px, 34 × 70 Zellen
    handy: {
      blurInputAfterSending: true,
      cellColumns: 34,
      wallWidth: 1.5,
    },
```

Der Text landet zusätzlich in der Zwischenablage (wenn der Browser das erlaubt, sonst von
Hand markieren). In `config.js` ersetzt er den gleichnamigen Block unter `profiles`.
Aufgeführt sind nur Werte, die von `base` abweichen.

**Feste Spaltenzahl.** Steht `cellColumns` über 0, wird die Zellgröße aus der Breite der
Bühne errechnet (auf ganze Geräte-Pixel abgerundet) und der Regler „Zellgröße" gilt nicht.
So hat jedes Handy unabhängig von seiner Breite 34 Spalten, also 7 Zeichen pro Zeile.
Bei 375 px Breite sind das 11 px je Zelle, bei 430 px 12,5 px.

**Das Handy-Profil** rechnet alles auf diese Zellgröße herunter: Wandstärke 1,5 statt 3,
Überstrahlen Reichweite 3 statt 7, Spurstärke 3 statt 5, Leuchten 7 statt 16, Versatz der
Störung 8 statt 14, höchste Pixeldichte 2 statt 3. Geschätzt, von Christian nicht bestätigt.

## Handy

**Layout.** Die Seite ist genau so hoch wie das Fenster und scrollt nie. Oben das
Labyrinth, darunter Fragefeld, „Senden" und „Regler". Die Regler-Leiste klappt als Blatt
über den unteren Teil des Labyrinths auf; die Bühne ändert dabei ihre Größe nicht.

**Die Falle mit der Bildschirmtastatur.** Manche Browser machen das Fenster niedriger,
wenn die Tastatur aufgeht. In Prototyp 5 hätte das ein neues Labyrinth erzeugt. Jetzt:

- Das Canvas bekommt beim Aufbau eine feste Größe in Pixeln (`fitCanvasToStage`). Schrumpft
  die Bühne, bleibt das Bild unverzerrt stehen und wird unten abgeschnitten.
- Auf Größenänderungen wird erst reagiert, wenn die Bühne 0,3 s ruhig war
  (`watchStageSize`), und dann nach dieser Regel (`rebuildIfStageChanged`):

| Was sich geändert hat | Folge |
|---|---|
| Breite (Handy gedreht, Fenster gezogen, Regler-Leiste am Rechner auf/zu) | neues Labyrinth, Antwort beginnt von vorn |
| nur Höhe, während ein Textfeld den Fokus hat | nichts |
| nur Höhe, ohne Fokus in einem Textfeld | neues Labyrinth |
| nichts (z. B. Tastatur wieder zu, alte Höhe) | nichts |

- **Adressleiste:** Weil die Seite nicht scrollt, fährt die Adressleiste nicht ein und aus.
- Neue Antworten benutzen das Raster des letzten Aufbaus, nicht die augenblickliche Höhe.

**Eingabe.** Alle Eingabefelder haben mindestens 16 px Schrift (sonst zoomt iOS beim
Antippen hinein). Fragefeld und Knöpfe sind 48 px hoch. Im Handy-Profil verlässt die Seite
nach dem Senden das Fragefeld, damit die Tastatur zugeht und das Labyrinth frei ist.

**Leistung.** Kosten pro Bild: Hintergrund füllen, ein vorab gezeichnetes Wandbild
kopieren, die noch leuchtenden Wegstücke, der Punkt, das Flimmern, die vorab gezeichnete
Glasscheibe. Wartet die Seite auf eine Frage, wird gar nicht gezeichnet.
Teuer ist ein einzelner Moment: das Wandbild einer neuen Seite (Lichthof um alle Wände).
Es entsteht, sobald eine Frage abgeschickt wird bzw. der Punkt eine Seite verlässt.
Der Regler „Höchste Pixeldichte" senkt die Zahl der Pixel (Handy-Profil: 2).

**Bilder pro Sekunde.** Oben in der Regler-Leiste steht der Wert der letzten Sekunde,
darunter der niedrigste Sekundenwert und das längste einzelne Bild seit der letzten Frage.
So lässt sich eine Frage bei geschlossener Leiste stellen und danach nachsehen, ob es
geruckelt hat.

## Einzeldatei fürs Handy

```
./baue-einzeldatei.sh
```

schreibt **zwei** Dateien (siehe auch „Besucherfassung"):

- `einzeldatei/labyrinth-prototyp-6.html`: der Prototyp mit Reglern
- `../../live/index.html`: die Besucherfassung

Beide sind `index.html`, in der jede Zeile `<script src="…"></script>` durch den Inhalt
der Datei ersetzt ist. Sie brauchen nichts anderes. **Nach jeder Änderung an `config.js`,
einem anderen Skript, `index.html` oder dem Ordner `besucher/` neu bauen.**

Am Handy öffnet nicht jeder Browser eine lokale HTML-Datei gleich bereitwillig (iOS zeigt
sie aus „Dateien" heraus teils nur als Vorschau ohne Skripte). Wenn das hakt, die Datei
kurz über einen Webserver im Heimnetz ausliefern.

## Besucherfassung

`/home/fonzy/projects/christianhoerauf_de/live/index.html` ist die Seite für
christianhoerauf.de: eine einzelne Datei, die von Hand in den S3-Bucket geladen wird.
Sie entsteht aus demselben Code wie der Prototyp – **nie von Hand ändern, immer neu bauen.**

Das Bau-Skript macht für sie drei Dinge zusätzlich, alle aus dem Ordner `besucher/`:

| Zutat | Wirkung |
|---|---|
| `config-besucher.js` | wird direkt hinter `config.js` eingebaut und überschreibt mit `Object.assign` einzelne Werte von `CONFIG` |
| `kopf.html` | ersetzt die `<title>`-Zeile: Titel „Christian Hörauf", Meta-Beschreibung, leeres Symbolbild (sonst fragt der Browser vergeblich nach `favicon.ico`) |
| `inhalt.html` | steht gleich hinter `<body>`: der Einstiegstext als unsichtbare Überschrift für Screenreader und Suchmaschinen, dazu ein `noscript`-Hinweis |

Was `config-besucher.js` ändert:

- `showControls: false` – kein Knopf „Regler". Die Regler-Leiste steckt weiter (versteckt)
  in der Seite, weil die Werte aus ihren Feldern gelesen werden; es gelten also genau die
  Werte der Geräteprofile `desktop` und `handy` aus `config.js`.
- `showReplayButton: true` – dafür der Knopf „Nochmal".
- `allowLiteralAnswers: false` – `=TEXT` ist eine Frage wie jede andere.
- `greeting`: „Hier entsteht die Internetpräsenz von Christian Hörauf"
- `answers: []` und `unknownAnswer`: Auf jede Frage folgt „Ich bin noch ein Prototyp. Ich
  kann noch nicht antworten."

**Der Einstiegstext steht zweimal da:** mit Trennstellen in `config-besucher.js` und als
lesbarer Text in `inhalt.html` (und in der Beschreibung in `kopf.html`). Bei einer Änderung
alle Stellen anpassen.

Für Screenreader ist das Canvas ausgeblendet (`aria-hidden`); jede Antwort steht zusätzlich
als unsichtbarer Text in `#spokenAnswer` (`speakAnswer`).

So werden die beiden Texte umbrochen (gemessen, reine Laufzeit ohne Verglimmen und Schieben):

| | Zeilen | Seiten | Laufzeit |
|---|---|---|---|
| Einstieg, Handy 390 × 844 | HIER / ENT- / STEHT / DIE / INTER- / NETPRÄ- / SENZ / VON ‖ CHRIS- / TIAN / HÖRAUF | 2 | 15,7 s |
| Antwort, Handy 390 × 844 | ICH BIN / NOCH / EIN / PROTO- / TYP. / ICH / KANN / NOCH ‖ NICHT / ANTWOR- / TEN. | 2 | 14,8 s |
| Einstieg, Desktop 1300 × 700 | HIER / ENTSTEHT DIE / INTERNETPRÄ- ‖ SENZ VON / CHRISTIAN / HÖRAUF | 2 | 15,3 s |
| Antwort, Desktop 1300 × 700 | ICH BIN NOCH / EIN / PROTOTYP. ‖ ICH KANN / NOCH NICHT / ANTWORTEN. | 2 | 14,5 s |

Die Zeilen sind am Handy immer dieselben (34 Spalten, 7 Zeichen). Wo die Seite wechselt,
hängt von der Höhe ab: Im nachgeahmten Handy ohne Browser-Leisten passen 8 Zeilen auf eine
Seite, auf einem echten Handy eher 6 oder 7. Am Desktop hängen auch die Zeilen von der
Fensterbreite ab.

## Der Monitor, die Leuchtspur

Unverändert aus Prototyp 5: Die Wände einer Seite werden einmal in drei Schichten
(Lichthof, Linie, heller Kern) auf ein unsichtbares Canvas gezeichnet und pro Bild nur
kopiert. Zeilenraster und dunkle Ecken liegen als vorab gezeichnete Glasscheibe darüber.
Die Spur leuchtet erst voll, blendet dann aus und wird in 16 Helligkeitsstufen gezeichnet.
Eine Bildstörung ist ein Balken, in dem die Bildzeilen seitlich verrutschen.

Reihenfolge beim Zeichnen eines Bildes: Hintergrund → Wände, Spur, Punkt → Störung →
Flimmern → Glasscheibe.

## config.js

| Name | Was es ist |
|---|---|
| `CONFIG` | Das eine Objekt mit Antwort-Tabelle, Grundwerten und Profilen (siehe „Config und Geräteprofile"). **Neu.** |

## schrift.js

| Name | Was es tut |
|---|---|
| `GLYPHS` | Pro Zeichen die Liste der Wegpunkte `[x, y]` (oder `[x, y, DOT]` bzw. `[x, y, HOP]`) im 3×5-Kästchen. Erster und letzter Wegpunkt liegen in der untersten Zeile. **Neu:** der Satzpunkt `.`. |
| `BREAK_MARK` | Das Trennstellen-Zeichen `\|`. **Neu.** |
| `DOT`, `HOP` | Markierungen an Wegpunkten: `DOT` = ohne Spur hin, Punkt hinterlassen, ohne Spur zurück; `HOP` = ohne Spur hin. |
| `GLYPH_HEIGHT`, `CHAR_ADVANCE`, `LANE_HEIGHT` | Höhe eines Buchstabens (5), Breite eines Zeichens samt Abstand (4), Höhe der Verbindungsspur (1). `LANE_HEIGHT` ist **neu**. |
| `lineAdvanceOf(returnBandRows)` | Wie viele Rasterzeilen eine Textzeile belegt: Buchstaben + Verbindungsspur + Band für den Zeilenwechsel. Ersetzt die feste Zahl `LINE_ADVANCE`. **Neu.** |
| `normalizeText(text)` | Wandelt die Eingabe in darstellbaren Text: Großbuchstaben, ß wird SS, unbekannte Zeichen entfernt, Mehrfach-Leerzeichen zusammengefasst. Punkte und Trennstellen-Zeichen bleiben stehen. **Geändert.** |
| `withoutBreakMarks(text)` | Entfernt alle Trennstellen-Zeichen: aus „PRO\|TO\|TYP" wird „PROTOTYP". **Neu.** |
| `readBreakMarks(word)` | Zerlegt ein Wort in seine Buchstaben (`letters`) und die Stellen, vor denen getrennt werden darf (`breakPositions`). **Neu.** |
| `hyphenate(word, maxCharsPerLine)` | Zerteilt ein zu langes Wort in Stücke mit Trennstrich: an der spätesten markierten Trennstelle, die samt Strich in die Zeile passt, sonst nach Platz. Ist die Zeile für zwei Buchstaben plus Strich zu kurz (unter 3 Zeichen), wird ohne Strich zerteilt. **Geändert.** |
| `avoidLonelyCharacters(lines, maxCharsPerLine)` | Steht ein einzelnes Zeichen allein in einer Zeile, rutscht das letzte Wort der Zeile davor mit hinunter, wenn es dort Platz hat. |
| `wrapText(text, maxCharsPerLine)` | Bricht an Wortgrenzen in Zeilen um. Zu lange Wörter werden mit Trennstrich zerteilt, einsame Zeichen vermieden. Die fertigen Zeilen enthalten keine Trennstellen-Zeichen mehr. **Geändert.** |

## labyrinth.js

| Name | Was es tut |
|---|---|
| `LETTER`, `CONNECTOR`, `SILENT` | Die Arten von Wegstücken (siehe oben). |
| `STEPS_OUTSIDE` | Wie viele Zellen der Lichtpunkt vor dem Eingang startet und hinter dem Ausgang verschwindet. |
| `OUTWARD` | Pro Rand die Richtung, die aus dem Raster hinausführt. |
| `OPPOSITE_SIDE` | Pro Rand der gegenüberliegende Rand. |
| `FREE_COLS_BESIDE_TEXT`, `FREE_ROWS_AROUND_TEXT` | Wie viele Spalten neben und Zeilen über/unter dem Textblock mindestens frei bleiben. |
| `createRandom(seed)` | Zufallsgenerator (Mulberry32), der bei gleichem Startwert dieselbe Zahlenfolge liefert. |
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
| `findWindingPath(cols, rows, isAllowed, from, to, random, detour)` | Erfindet einen gewundenen Weg: baut über den erlaubten Zellen ein Wegwerf-Labyrinth und nimmt den darin einzigen Weg von `from` nach `to`. Wird jetzt auch für den Zeilenwechsel benutzt. |
| `textCapacity(cols, rows, maxLinesPerPage, returnBandRows)` | Rechnet aus, wie viele Zeichen in eine Zeile und wie viele Zeilen auf eine Seite passen. Berücksichtigt jetzt die Höhe des Bands. **Geändert.** |
| `splitIntoPages(lines, linesPerPage)` | Teilt die Zeilenliste in Seiten. Leerer Text ergibt eine Seite mit einer leeren Zeile. |
| `layoutTextBlock(lines, cols, rows, returnBandRows)` | Berechnet die zentrierte Lage des Textblocks (äußerste Zellen links/rechts/oben/unten). Berücksichtigt jetzt die Höhe des Bands. **Geändert.** |
| `walkTo(route, x, y, kind)` | Verlängert die Route in gerader Linie bis zur Zielzelle, eine Zelle pro Schritt, mit der angegebenen Art. |
| `appendGlyph(route, waypoints, glyphLeft, glyphTop)` | Hängt den Weg durch einen Buchstaben an und vergibt dabei die Arten (Einstieg = Verbinder, Hüpfer = ohne Spur, sonst Buchstabe). |
| `appendLineChange(route, band, descentCol, nextLaneRow, grid, random, windiness)` | Hängt den Zeilenwechsel an: einen Schritt hinunter ins Band, in Windungen durch das Band nach links bis zur Spalte links neben der nächsten Zeile, dort gerade hinunter in deren Verbindungsspur. **Neu.** |
| `appendTextRoute(route, lines, grid, block, random, options)` | Hängt den Weg durch den ganzen Text einer Seite an: vom linken Tor über alle Zeilen zum rechten Tor. Der Zeilenwechsel läuft jetzt über `appendLineChange`. **Geändert.** |
| `pickBorderCell(side, cols, rows, columnRange, random)` | Wählt eine zufällige Zelle am gewünschten Rand; oben/unten nur im angegebenen Spaltenbereich. |
| `cellOutside(borderCell, side, distance)` | Die Zelle, die so viele Schritte außerhalb vor einer Randzelle liegt. |
| `pickFirstEntrance(sideWish, cols, rows, random)` | Wählt Rand und Zelle für den Eingang des allerersten Labyrinths: links, oben oder unten (oben/unten in der linken Hälfte, nicht in der Eckspalte). |
| `entranceOppositeOf(exit, cols, rows)` | Der Eingang einer Folgeseite oder Folgeantwort: gegenüberliegender Rand, gleiche Zeile bzw. Spalte wie der Ausgang davor. |
| `exitColumnRange(side, entrance, cols)` | In welchen Spalten ein Ausgang oben/unten liegen darf: rechte Hälfte ohne Eckspalte, und rechts vom Eingang, falls der am selben Rand liegt. `min > max` heißt: kein Platz. |
| `pickExit(sideWish, entrance, cols, rows, random)` | Wählt Rand und Zelle des Ausgangs. Übergeht Ränder ohne Platz; rechts geht immer. |
| `dividingColumn(side, entrance, exit, cols)` | Die Trennspalte im Streifen über bzw. unter dem Text: links davon Anlauf, ab ihr Ablauf. |
| `createTerritories(block, cols, entrance, exit)` | Teilt alle Zellen in die drei Reviere und gibt die Prüf-Funktionen `isText`, `isApproach`, `isLeave` zurück. |
| `buildRoute(lines, block, cols, rows, entrance, exit, random, options)` | Baut die ganze Route einer Seite: von außen herein, Anlauf, Text, Ablauf, hinaus. Bekommt die Lage des Textblocks jetzt übergeben. **Geändert.** |
| `carveRoute(maze, route)` | Bricht entlang der Route die Wände heraus (Schritte außerhalb des Rasters werden übersprungen). |
| `rowsOfLanesAndBands(lineCount, block, returnBandRows)` | Die Rasterzeilen, in denen der Punkt lange waagrecht läuft: je Textzeile die Verbindungsspur und – außer unter der letzten – die Zeilen des Bands. **Neu.** |
| `breakUpLongWalls(maze, route, lineCount, block, random, options)` | Geht in diesen Rasterzeilen die Wand darunter von links nach rechts durch. Verläuft auf einer ihrer Seiten die Route und ist ein Wandstück länger als eine gewürfelte Länge (halbes bis ganzes `maxWallRun`), wird dort ein Durchgang gebrochen. Bei `maxWallRun` 0 passiert nichts. **Neu.** |
| `generatePage(lines, cols, rows, entrance, random, options)` | Erzeugt eine Seite: Ausgang wählen, Textblock legen, Route bauen, freibrechen, lange Wände unterbrechen, Rest wachsen lassen. Gibt `{ maze, route, entrance, exit, lines }` zurück. **Geändert.** |
| `generateMessagePages(text, cols, rows, seed, options, exitBefore)` | Der Einstieg: Text aufbereiten, umbrechen, auf Seiten verteilen und für jede Seite ein Labyrinth erzeugen, dessen Eingang dem Ausgang davor gegenüberliegt. Mit `exitBefore` schließt schon die erste Seite an ein voriges Labyrinth an. **Geändert.** |

## antworten.js

| Name | Was es tut |
|---|---|
| `LITERAL_PREFIX` | Das Zeichen `=`: beginnt die Eingabe damit, wird der Rest wörtlich geschrieben. **Neu.** |
| `simplifyForMatching(text)` | Macht einen Text vergleichbar: Kleinbuchstaben, alles außer Buchstaben und Ziffern wird zu Leerzeichen, vorn und hinten genau ein Leerzeichen. Aus „Wer bist du?" wird „ wer bist du ". **Neu.** |
| `containsKeyword(question, keyword)` | Kommt das Stichwort als ganzes Wort oder ganze Wortfolge in der Frage vor? **Neu.** |
| `findAnswer(question, config)` | Liefert den Antworttext: wörtlich nach `=` (nur wenn `allowLiteralAnswers` an ist), sonst die Antwort des ersten passenden Tabelleneintrags, sonst die „weiß ich nicht"-Antwort. **Neu.** |

## einstellungen.js

| Name | Was es tut |
|---|---|
| `PROFILE_URL_PARAMETER` | Der Name des Adress-Parameters `profil`. **Neu.** |
| `activeProfileName` | Der Name des Profils, mit dessen Werten die Regler zuletzt gefüllt wurden. **Neu.** |
| `profileNameForWidth(config, windowWidth)` | `desktop` ab der Schwelle `desktopFromWidth`, sonst `handy`. **Neu.** |
| `profileNameFromUrl(config)` | Das mit `?profil=…` gewünschte Profil, oder `null`, wenn keines oder ein unbekanntes dasteht. **Neu.** |
| `SEED_URL_PARAMETER` | Der Name des Adress-Parameters `seed`. **Neu.** |
| `seedFromQuery(query)` | Liest aus einer Adresszeile wie `?seed=123` den Startwert als Zahl. Steht dort keiner oder keine ganze Zahl ab 0 (leer, `abc`, `1.5`, `-3`), kommt `null`. Kennt keinen Browser, deshalb in Node testbar. **Neu.** |
| `seedFromUrl()` | `seedFromQuery` angewandt auf die Adresse der aktuellen Seite. **Neu.** |
| `valuesOfProfile(config, profileName)` | Alle Werte eines Profils: die Grundwerte, überschrieben mit den Abweichungen des Profils. **Neu.** |
| `setControlValue(control, value)` | Setzt einen Regler: Ankreuzfeld auf wahr/falsch, alle anderen auf den Wert als Text. **Neu.** |
| `controlValue(control)` | Liest einen Regler im passenden Typ: Ankreuzfeld → wahr/falsch, Schieberegler und Zahlenfeld → Zahl, sonst Text. **Neu.** |
| `applyProfile(config, profileName)` | Macht ein Profil zum aktiven: merkt sich den Namen, setzt `body[data-profile]` (Layout) und füllt alle Regler mit den Werten. Steht in der Adresse `?seed=…`, bekommt der Regler „Zufalls-Startwert" diesen Wert statt des Profilwerts. **Geändert.** |
| `currentValues(config)` | Die Werte, wie sie jetzt gelten: für jeden Namen aus `base` der Stand seines Reglers; Namen ohne Regler behalten den Wert aus dem aktiven Profil. **Neu.** |
| `readSettings()` | Liest alle Regler in das Objekt, mit dem Labyrinth und Zeichnung arbeiten. Prozentwerte werden zu Anteilen von 0 bis 1. **Neu gebaut.** |
| `configTextOf(config, profileName, values, note)` | Schreibt die Werte als fertigen Profil-Block für `config.js` auf – nur die, die von den Grundwerten abweichen, mit `note` als Kommentarzeile darüber. **Neu.** |
| `copyBySelection(textarea)` | Kopiert auf dem alten Weg: Text im Textfeld markieren und den Browser „kopieren" lassen. Liefert, ob es geklappt hat. **Neu.** |
| `copyToClipboard(textarea)` | Kopiert den Inhalt des Textfelds in die Zwischenablage: erst über die moderne Schnittstelle, sonst über `copyBySelection`. Liefert ein Versprechen mit wahr/falsch. **Neu.** |

## seite.js

| Name | Was es tut |
|---|---|
| `stage`, `canvas`, `ctx` | Die Bühne (das Element um das Canvas), das Canvas und sein Zeichenwerkzeug. |
| `WRITING`, `FADING`, `SCROLLING`, `FINISHED` | Die Abschnitte der Animation (siehe „Frage und Antwort"). `FINISHED` heißt jetzt: warten auf die nächste Frage. |
| `MIN_COLS`, `MIN_ROWS` | Kleiner wird das Raster nie (10 × 10): so viel braucht ein einzelnes Zeichen samt Rändern. **Neu.** |
| `RESIZE_SETTLE_MILLIS` | So lange muss die Bühne ruhig sein, bevor auf eine Größenänderung reagiert wird (300 ms). **Neu.** |
| `LONGEST_PAUSE_SECONDS` | Längste Zeitspanne, die ein Bild die Animation weiterstellt (0,1 s) – gegen Riesensprünge nach einer Pause. |
| `scene` | Der Zustand zwischen zwei Bildern: aktuelle Antwort, Seiten ab der aktuellen, Abschnitt, Größe von Bühne und Raster, Fortschritt, Uhr, Laufzeiten der Schritte, aufgehobene Wandbilder und Glasscheibe, laufende Störung. |
| `currentSettings` | Die Reglerwerte, mit denen gerade gearbeitet wird. Nur neu gelesen, wenn ein Regler bewegt wurde. **Neu.** |
| `REGENERATING_CONTROLS` | Die Regler, die ein neues Labyrinth verlangen. Alle anderen ändern nur das Aussehen. |
| `BRIGHTNESS_LEVELS` | In so viele Stufen (16) wird die Helligkeit der Spur eingeteilt. |
| `pixelRatioOf(settings)` | Mit wie vielen Geräte-Pixeln pro Pixel gezeichnet wird: die Pixeldichte des Geräts, gedeckelt durch „Höchste Pixeldichte". **Neu.** |
| `fitCanvasToStage(settings)` | Misst die Bühne, merkt sich ihre Größe und trägt sie als feste Pixelgröße am Canvas ein – es folgt der Bühne danach nicht mehr von selbst. **Geändert.** |
| `applyDrawingScale()` | Stellt den Maßstab des Canvas ein (ein Seiten-Pixel = so viele Geräte-Pixel, wie das Canvas breiter ist als die Bühne). Läuft vor jedem Bild, weil der Browser den Zeichenzustand jederzeit vergessen darf. **Neu am 2026-10-12.** |
| `discardPreparedImages()` | Wirft die vorab gezeichneten Bilder (Wände, Zeilenraster) weg, damit sie neu entstehen. Wird aufgerufen, wenn die Seite aus dem Hintergrund zurückkommt oder der Browser das Canvas neu angelegt hat. **Neu am 2026-10-12.** |
| `cellSizeFor(settings)` | Die Zellgröße: der Regler, oder bei fester Spaltenzahl Bühnenbreite durch Spaltenzahl, abgerundet auf ganze Geräte-Pixel. **Neu.** |
| `layoutGrid(settings)` | Teilt die Bühne ein: Zellgröße, Spalten, Zeilen (mindestens `MIN_COLS` × `MIN_ROWS`) und der Rand zum Zentrieren. **Neu.** |
| `createAnswer(text, question)` | Legt eine Antwort an: Text, die Frage dazu, laufende Nummer, Seitenzahl (noch 0). Zählt `scene.answerCount` weiter. **Neu.** |
| `buildAnswerPages(answer, exitBefore, settings)` | Erzeugt die Seiten einer Antwort (Startwert = Regler + Nummer der Antwort), trägt die Seitenzahl in die Antwort ein und merkt an jeder Seite Antwort und Seitennummer. **Neu.** |
| `isSuperseded(page)` | Gehört die Seite zu einer Antwort, die von einer neueren Frage überholt wurde? **Neu.** |
| `showAnswer(text, question)` | Nimmt eine neue Antwort auf: behält nur die sichtbaren Seiten, hängt die neuen Seiten passend zum letzten Ausgang an, beginnt aus `FINISHED` heraus sofort das Weiterschieben, zeichnet das nächste Wandbild vor, setzt die Bildraten-Messung zurück und legt den Text für Screenreader ab. **Neu.** |
| `replayLastAnswer()` | Der Knopf „Nochmal": gibt Text und Frage der letzten Antwort noch einmal an `showAnswer` – das Bild schiebt weiter, der Text wird in einem frischen Labyrinth neu geschrieben. **Neu.** |
| `onQuestionSubmitted(event)` | Das Fragefeld wurde abgeschickt: leere Eingaben übergehen, Antwort suchen und zeigen, Feld leeren und – je nach Schalter – verlassen. **Neu.** |
| `speakAnswer(answer)` | Schreibt den Antworttext (ohne Trennstellen-Zeichen, sonst wie in der Config) in das unsichtbare Feld `#spokenAnswer`, das ein Screenreader vorliest. **Neu.** |
| `writtenTextOf(answer)` | Der Text einer Antwort, wie die Schrift ihn schreibt, in einer Zeile: Großbuchstaben, ohne unbekannte Zeichen, ohne Trennstellen-Zeichen. **Neu.** |
| `showAnswerTextIfWanted(settings)` | Zeigt die Antwort als normalen Text unten im Labyrinth, wenn der Schalter an und die Animation fertig ist; sonst versteckt es ihn. **Neu.** |
| `currentPage()` | Die Seite, auf der der Lichtpunkt gerade unterwegs ist. |
| `hasNextPage()` | Kommt nach der aktuellen Seite noch eine? |
| `enterPhase(phase)` | Beginnt einen Abschnitt der Animation, merkt sich den Stand der Uhr und bringt den Antwort-Text auf Stand. |
| `startPage(pageIndex)` | Setzt den Lichtpunkt an den Anfang der Seite, vergisst die Spur, beginnt mit `WRITING`, räumt alte Wandbilder weg und zeigt „Seite x von y". |
| `regenerate()` | Baut die aktuelle Antwort von vorn auf: Bühne messen, Raster einteilen, Seiten erzeugen, bei Seite 1 starten, Status schreiben. Läuft beim Laden, bei „nochmal abspielen", bei geänderter Bühne und bei Reglern, die ein neues Labyrinth verlangen. **Geändert.** |
| `paceOf(kind, page, settings)` | Zellen pro Sekunde auf einem Wegstück: in Buchstaben das Tempo, sonst das Tempo mal den Verbinder-Faktor; auf Seiten einer überholten Antwort zusätzlich mal den Schnelldurchlauf. **Geändert.** |
| `walkingSecondsOfAllPages(settings)` | Reine Laufzeit über alle noch anstehenden Seiten (für die Status-Zeile). |
| `showPageStatus()` | Schreibt „Seite x von y" der zugehörigen Antwort in die Regler-Leiste, bei überholten Antworten mit dem Hinweis „Schnelldurchlauf". **Geändert.** |
| `showStatus(settings)` | Schreibt in die Regler-Leiste, welche Frage zu welcher Antwort geführt hat, dazu Raster, Zellgröße, Zeilen und Zeichen je Seite und die Laufzeit. **Neu.** |
| `centerOf(cell)` | Rechnet eine Zelle in den Canvas-Punkt ihrer Mitte um. |
| `positionAt(progress)` | Wo auf der Route der aktuellen Seite der Punkt nach `progress` Schritten steht – auch zwischen zwei Zellen. |
| `advanceDot(steps)` | Bewegt den Lichtpunkt um eine Anzahl Schritte weiter. Nur für „Diese Seite überspringen". |
| `rememberWalkedSteps(stepsDoneBefore)` | Merkt sich für alle seither fertig gelaufenen Schritte die Uhrzeit (daraus ergibt sich das Verglimmen). |
| `walkFor(seconds, settings)` | Lässt den Punkt eine Zeitspanne lang laufen und rechnet dabei Schritt für Schritt mit dem jeweiligen Tempo ab. |
| `trailLifetime(settings)` | Wie lange ein Wegstück insgesamt zu sehen ist: volle Leuchtdauer + Ausblenddauer. |
| `stepAnimation(seconds, settings)` | Stellt die Uhr weiter und führt die Animation fort: Punkt bewegen, bei Bedarf in den nächsten Abschnitt bzw. auf die nächste Seite wechseln. Überholte Antworten warten das Verglimmen nicht ab. **Geändert.** |
| `easeInOut(part)` | Sanftes Anfahren und Abbremsen für das Weiterschieben (bildet 0..1 auf 0..1 ab). |
| `scrollShifts(settings)` | Um wie viele Pixel die alte (`outgoing`) und die neue Seite (`incoming`) gerade verschoben sind. |
| `traceWalls(context, page)` | Legt alle Wände einer Seite als Linien in den Pfad eines Canvas, mit Lücken an Eingang und Ausgang. Zeichnet selbst noch nichts. |
| `wallLookOf(settings)` | Fasst alles, was das Aussehen der Wände bestimmt, zu einem Text zusammen. Ändert er sich, ist das aufgehobene Wandbild veraltet. |
| `renderWallImage(page, settings)` | Zeichnet die Wände einer Seite in drei Schichten (Lichthof, Linie, heller Kern) auf ein eigenes, unsichtbares Canvas. Gibt Bild, Rand, Größe und Aussehen zurück. |
| `wallImageOf(page, settings)` | Liefert das fertige Wandbild einer Seite; zeichnet es nur neu, wenn es fehlt oder veraltet ist. Die Bilder hängen jetzt an der Seite selbst statt an ihrer Nummer. **Geändert.** |
| `prepareNextWallImage(settings)` | Zeichnet das Wandbild der nächsten Seite vorab, damit das Weiterschieben nicht mit einem Ruckler beginnt. |
| `forgetUnneededWallImages()` | Wirft Wandbilder von Seiten weg, die weder aktuell noch als nächste dran sind. |
| `drawWalls(page, settings)` | Kopiert das fertige Wandbild einer Seite auf das sichtbare Canvas. |
| `brightnessLevelOf(step, settings)` | Wie hell ein gelaufener Schritt noch leuchtet, als Stufe 0–16: erst voll, dann linear bis zur Rest-Helligkeit. |
| `firstGlowingStep(settings)` | Der erste Schritt der Route, der noch leuchtet. Alles davor ist verglommen und wird beim Zeichnen übersprungen. Bei Rest-Helligkeit über 0 ist das Schritt 1. **Neu.** |
| `strokeWalkedSegments(kind, level, levelOfStep, steps, settings)` | Zeichnet im noch leuchtenden Abschnitt die Wegstücke einer Art und einer Helligkeitsstufe in einem Rutsch, jedes um eine halbe Spurbreite nach hinten versetzt (keine Überlappung). Zeichnet nichts, wenn kein Stück passt. **Geändert.** |
| `fillUmlautDots(level, levelOfStep, steps, settings)` | Zeichnet die schon besuchten Umlaut-Punkte einer Helligkeitsstufe. **Geändert.** |
| `drawTrail(settings)` | Zeichnet die Spur: erst blass die Verbinder, darüber die Buchstaben und Punkte, jeweils Stufe für Stufe – nur für den noch leuchtenden Abschnitt. **Geändert.** |
| `TRAIL_CORE_WIDTH_PART` | Wie breit der helle Kern im Verhältnis zur Spur ist (0,45). **Neu am 2026-10-13.** |
| `drawTrailCore(levelOfStep, steps, settings)` | Zeichnet in die Mitte der Buchstaben-Spur einen schmalen weißen Kern, so stark wie der Regler „Heller Kern der Spur" (`trailCore`). Damit ist die Spur das hellste Element im Bild und auch in Graustufen lesbar. Bei 0 passiert nichts. **Neu am 2026-10-13.** |
| `drawPlannedPath(settings)` | Zeichnet gestrichelt den Weg, der auf dieser Seite noch vor dem Punkt liegt (abschaltbar). |
| `drawDot(settings)` | Zeichnet den Lichtpunkt: innen weiß, außen in seiner Farbe, mit Leuchten. |
| `drawTrailAndDot(settings)` | Zeichnet Spur und (nur während `WRITING`) Lichtpunkt, beschnitten auf die Labyrinth-Fläche. |
| `drawPage(page, shift, settings)` | Zeichnet eine Seite um `shift` Pixel verschoben: Wände und – auf der aktuellen Seite – Spur und Punkt. |
| `SCANLINE_SPACING` | Jede so-vielte Bildschirmzeile ist abgedunkelt. |
| `screenOverlayLookOf(settings)` | Fasst zusammen, was das Aussehen der Glasscheibe bestimmt (Canvas-Größe, Zeilenraster, dunkle Ecken). |
| `renderScreenOverlay(settings)` | Zeichnet Zeilenraster und dunkle Ecken einmal vorab auf ein eigenes Canvas. |
| `drawScreenOverlay(settings)` | Legt die Glasscheibe über das Bild; zeichnet sie nur neu, wenn sie veraltet ist. |
| `drawFlicker(settings)` | Dunkelt das Bild um einen kleinen Zufallswert ab. |
| `startGlitch()` | Beginnt eine Bildstörung mit zufälliger Dauer und Balkenhöhe. |
| `maybeStartGlitch(seconds, settings)` | Würfelt, ob in diesem Bild eine Störung beginnt – nur solange die Animation läuft und keine andere Störung aktiv ist. |
| `drawGlitch(settings)` | Zeichnet die laufende Störung: verrutschte Bildzeilen im Störbalken, heller Schleier, Rausch-Striche. Beendet sie, wenn der Balken unten ist. |
| `drawScene(settings)` | Ein komplettes Bild: Hintergrund, aktuelle Seite und während des Weiterschiebens die nächste, darüber Störung, Flimmern und Glasscheibe. |
| `frameMeter` | Der Stand der Bildraten-Messung: Beginn der laufenden Mess-Sekunde, Bilder darin, niedrigster Sekundenwert und längstes Bild seit der letzten Frage. **Neu.** |
| `resetFrameMeter()` | Beginnt die Messung neu – bei jeder Frage und wenn der Tab aus dem Hintergrund zurückkommt. **Neu.** |
| `countFrame(now, millisSinceLastFrame)` | Zählt ein Bild mit, merkt sich das längste und schreibt einmal pro Sekunde das Ergebnis in die Regler-Leiste. **Neu.** |
| `showFrameRate(rate)` | Schreibt „x Bilder pro Sekunde" samt niedrigstem Wert und längstem Bild in den Kopf der Regler-Leiste. **Neu.** |
| `onAnimationFrame(now)` | Läuft pro Bildschirm-Bild: misst die vergangene Zeit, ruft `stepAnimation` und `maybeStartGlitch`, zeichnet neu, solange sich etwas bewegt, und zählt das Bild. |
| `isTypingInTextField()` | Hat gerade ein Textfeld, Zahlenfeld oder mehrzeiliges Feld den Fokus? Dann ist am Handy vermutlich die Tastatur offen. **Neu.** |
| `rebuildIfStageChanged()` | Vergleicht die Bühne mit der Größe, für die gebaut wurde. Andere Breite → `regenerate`. Nur andere Höhe → `regenerate` nur, wenn gerade nicht getippt wird. **Neu.** |
| `watchStageSize()` | Beobachtet Fenster und Bühne und ruft `rebuildIfStageChanged`, sobald die Größe 0,3 s ruhig war. **Neu.** |
| `onVisibilityChanged()` | Kommt der Tab aus dem Hintergrund zurück, beginnen Zeitmessung und Bildzählung neu. **Neu.** |
| `showSliderValues()` | Schreibt neben jeden Schieberegler seinen Wert. |
| `setControlsOpen(isOpen)` | Klappt die Regler-Leiste auf oder zu und vermerkt den Zustand am Knopf „Regler". **Neu.** |
| `showProfileInfo()` | Schreibt in die Regler-Leiste, welches Profil aktiv ist, die Fensterbreite und die Schwelle, und stellt die Profil-Auswahl passend. **Neu.** |
| `fillProfileChoice()` | Füllt die Profil-Auswahl mit den Profilen aus der Config. **Neu.** |
| `switchProfile(profileName)` | Wechselt von Hand auf ein anderes Profil: Regler füllen, Werte neu lesen, Labyrinth neu bauen. **Neu.** |
| `onControlChanged(control)` | Ein Regler wurde bewegt: Werte neu lesen, Anzeigen auffrischen und – wenn der Regler es verlangt – das Labyrinth neu bauen. **Neu.** |
| `showConfigText()` | Zeigt die aktuellen Reglerwerte als Profil-Block im Textfeld, kopiert ihn in die Zwischenablage und meldet, ob das geklappt hat. **Neu.** |
| `connectControls()` | Verbindet Fragefeld, Regler und Knöpfe mit ihren Aktionen. **Geändert.** |
| `start()` | Der Start: Profil wählen (Adresse vor Fensterbreite), Regler füllen, die Knöpfe „Regler" und „Nochmal" je nach Config zeigen oder verstecken, Regler-Leiste auf oder zu, Begrüßung als erste Antwort, Labyrinth bauen, Bühne beobachten, Animation anwerfen. **Neu.** |

## Tests

Aufruf im Ordner `prototypes/06-frage-antwort`:

```bash
node --test
```

Node findet alle Dateien `tests/*.test.js` selbst. Es braucht keine Pakete, nur Node.

| Datei / Name | Was es tut |
|---|---|
| `tests/lade-browser-skripte.js` → `loadBrowserScripts(fileNames)` | Lädt Skripte des Prototyps wie der Browser: nacheinander in einen gemeinsamen Bereich (Node-`vm`). Deklarierte Funktionen stehen danach als Eigenschaften bereit, Konstanten über `evaluate("NAME")`. Reicht `URLSearchParams` hinein, das ein leerer `vm`-Bereich nicht kennt. |
| `tests/einstellungen.test.js` | Prüft `seedFromQuery`: gültige Startwerte (auch neben `profil=`, auch 0) werden zur Zahl, alles andere zu `null`. |
| `tests/labyrinth.test.js` | Prüft an der Begrüßung auf einem Raster 34 × 60 mit festen Einstellungen (nicht aus `config.js`, damit Reglerwerte die Tests nicht berühren): gleicher Startwert → dasselbe Labyrinth, anderer Startwert → ein anderes, und Startwert 1 → weiterhin genau das bekannte Labyrinth (Prüfsumme über Wände, Route, Eingang, Ausgang). |

**Schlägt die Prüfsumme fehl,** hat eine Änderung an `labyrinth.js` oder `schrift.js` das
Labyrinth verändert, und ein notierter Startwert zeigt ein anderes Bild. Ist das gewollt,
den neuen Wert aus der Fehlermeldung („actual") in `tests/labyrinth.test.js` eintragen.

## Screenshots mehrerer Startwerte

Aufruf im Ordner `prototypes/06-frage-antwort`:

```bash
node werkzeuge/screenshots.js          # Startwerte 1 bis 10
node werkzeuge/screenshots.js 3 17 42  # nur diese
```

Öffnet `live/index.html?seed=…` in einem unsichtbaren Google Chrome, einmal als Handy und
einmal als Desktop, lässt die Begrüßung durchlaufen und fotografiert sie. Ergebnis:
`docs/screenshots/prototyp-6-seeds/` mit einer Übersichtsseite `index.html` (pro Startwert
eine Bildreihe in zeitlicher Folge, dazu Rastergröße, Seitenzahl, Laufzeit und ob die Seite
Fehler gemeldet hat). Bilder eines früheren Laufs werden vorher gelöscht. Dauer für 10
Startwerte: etwa 2 Minuten.

- **Handy:** wie der Gerätemodus der Entwicklertools – 390 × 844, Pixeldichte 3, Touch,
  iPhone-Kennung. Die Seite wählt das Profil „handy" selbst über die Breite. Gespeichert
  wird mit 780 px Breite (Pixeldichte 2), um Platz zu sparen.
- **Desktop:** 1440 × 900, Pixeldichte 1.
- **Momente pro Labyrinth-Seite:** 20 %, 50 % und 80 % des Wegs, Punkt hinausgelaufen;
  dazwischen das Weiterschieben, am Schluss das Ende. Weil in echter Zeit fotografiert
  wird, liegt der tatsächliche Anteil manchmal 1–2 % über dem Ziel; die Übersicht zeigt
  den tatsächlichen.
- **Was sich nicht wiederholt:** Flackern und Bildstörung würfeln mit `Math.random` und
  sind bei jedem Lauf anders. Das Labyrinth und die Route sind bei gleichem Startwert und
  gleicher Fenstergröße gleich.

| Name | Was es tut |
|---|---|
| `DEVICES` | Die beiden Geräte: Fenstergröße, Pixeldichte, Kennung, Touch, Verkleinerung beim Speichern. |
| `FRACTIONS_PER_PAGE` | Bei welchen Anteilen des Wegs je Seite fotografiert wird. |
| `startChrome()` | Startet Chrome headless mit leerem Profil und wartet, bis es seinen Debug-Port meldet. |
| `openTab(port)` | Öffnet einen Tab und verbindet sich per WebSocket. Liefert `send(methode, parameter)`, die gesammelten Fehler der Seite und `close()`. |
| `evaluate(tab, expression)` | Wertet einen Ausdruck in der Seite aus. |
| `ANIMATION_STATE` | Der Ausdruck, der Abschnitt, Seite, Weganteil, Raster, Profil und Startwert aus `seite.js` liest. |
| `waitForAnimation(tab)` | Wartet, bis die Seite geladen ist und die Animation läuft. |
| `imageNameOf(deviceName, seed, number, moment)` | Dateiname wie `handy-seed03-02-seite1-weg50.jpg`. |
| `photographRun(port, deviceName, seed)` | Ein Durchlauf: Gerät nachahmen, Seite mit `?seed=` öffnen, Zustand alle 40 ms abfragen und an den Momenten fotografieren. |
| `photographSeeds(deviceName, seeds)` | Ein Chrome arbeitet mehrere Startwerte nacheinander ab. |
| `splitIntoGroups(list, count)` | Verteilt die Startwerte reihum auf mehrere Chrome, die gleichzeitig laufen. |
| `escapeHtml(text)`, `runAsHtml(run)`, `writeOverviewPage(runs)` | Schreiben die Übersichtsseite. |
| `clearOldImages()` | Löscht die `.jpg` eines früheren Laufs im Zielordner. |

Das Werkzeug hat keine eigenen Tests: Es steuert einen echten Browser, und sein Ergebnis
prüft man am Bild.

## Was geprüft ist und was nicht

Geprüft mit Wegwerf-Skripten (nicht Teil des Prototyps):

- **Logik (Node):** 47 056 Seiten in 2 112 Antwort-Ketten über 11 Rastergrößen (auch
  34 × 50, 34 × 58, 10 × 10), Bandhöhen 1 bis 4, alle Ausgangsränder, auch Texte mit Punkten
  und Trennstellen: Route lückenlos, nie durch eine Wand, kreuzt sich nicht, alle Zellen
  erreichbar, Eingang jeder Folgeseite und Folgeantwort gegenüber dem Ausgang davor.
  Dazu 15 Umbruch-Fälle mit und ohne Trennstellen und die Zahl der geschriebenen Punkte.
- **Besucherfassung** (`live/index.html`, allein in einem leeren Ordner, Handy 390 × 844
  und Desktop 1300 × 700): Seitenkopf, versteckter Einstiegstext, keine Regler, Knopf
  „Nochmal" (mitten im Schreiben und nach dem Ende), jede Frage ergibt den Prototyp-Satz
  mit beiden Punkten, `=TEXT` wirkungslos, keine weitere Datei wird geladen, keine Fehler
  in der Konsole.
- **Ablauf in echter Zeit (Headless-Chrome, ferngesteuert):** nachgeahmtes Handy
  390 × 844 mit Pixeldichte 3 und Desktop 1300 × 700. Begrüßung, Frage per Enter,
  Schnelldurchlauf, Weiterschieben, Antwort, Fragen in schneller Folge und mitten im
  Weiterschieben, Tastatur auf/zu als Höhenänderung, Regler auf/zu, Drehen, Profilwechsel,
  Config-Text, keine Fehler in der Konsole. Dasselbe für die Einzeldatei, allein in einem
  leeren Ordner.
- **Aussehen:** Screenshots Handy und Desktop, Zeilenwechsel vorher/nachher.

**Nicht geprüft:** ein echtes Handy. Also weder echte Bildschirmtastaturen (iOS und Android
verhalten sich verschieden) noch die echte Bildrate noch Tippflächen unter dem Daumen noch
das Kopieren in die Zwischenablage (im Headless-Chrome nicht erlaubt; der Rückfall auf
„von Hand markieren" hat dort gegriffen). Firefox und Safari sind gar nicht geprüft.

## Versuch: heller Kern der Spur für Farbsehschwäche (2026-10-13)

**Beobachtet** von Christian: Stellt man das Handy auf Graustufen, ist der geschriebene
Text praktisch nicht lesbar. Die rote Spur ist in Graustufen dunkler als die grünen Wände.

**Versuch:** Config-Wert `trailCore` (Regler „Heller Kern der Spur", 0 bis 100 %). Er legt
einen schmalen weißen Kern in die Mitte der Buchstaben-Spur. Standard ist 0, das Aussehen
ist also unverändert, bis ein Wert gesetzt wird.

**Gemessen** an einem Standbild im Handy-Profil (Helligkeit 0 bis 255, hellste 10 % der
Pixel): Wände ab 179; Spur ohne Kern ab 106, mit Kern 85 % ab 213. Mit Kern ist die Spur
also heller als die Wände, ohne Kern deutlich dunkler.

**Noch offen:** die Entscheidung, ob und mit welchem Wert der Kern auf die Live-Seite
kommt. Geprüft ist nur am Standbild, nicht in Bewegung und nicht von Betroffenen.

## Behobener Fehler: kaputtes Bild nach einer Pause im Hintergrund (2026-10-12)

**Beobachtet** auf der Live-Seite am Handy: Nach dem Wechsel in eine andere App und
zurück wurde das Labyrinth nur noch in halber Größe links oben gezeichnet, daneben und
darunter standen hellgrüne, verschmierte Flächen.

**Ursache:** Der Maßstab des Canvas wurde nur einmal beim Aufbau eingestellt. Der Browser
hatte in der Pause den Zeichenzustand des Canvas zurückgesetzt, danach wurde in
Geräte-Pixeln statt in Seiten-Pixeln gezeichnet. Der Rest des Canvas wurde nie mehr
gelöscht; die grünen Flächen waren die beim Weiterschieben hereinrollenden Wandbilder,
Bild für Bild übereinander.

**Behebung:** `applyDrawingScale()` stellt den Maßstab vor jedem Bild ein, und
`discardPreparedImages()` erzeugt die vorab gezeichneten Bilder nach einer Pause neu.

**Geprüft** nur durch Nachstellen im Browser am Rechner (`ctx.reset()` vor einer neuen
Frage): vorher dasselbe kaputte Bild, nachher ein normales. Ob das Zurücksetzen am Handy
wirklich der Auslöser war, ist eine begründete Annahme, kein Beweis.

## Bekannte Schwächen

- **Handy ungeprüft**, siehe oben. Besonders unsicher: iOS verschiebt die Seite beim Tippen,
  statt das Fenster zu verkleinern; ob das Fragefeld dann sauber über der Tastatur steht
  und die Seite danach zurückrutscht, ist offen.
- Ist die Tastatur offen, verdeckt sie die untere Hälfte des Labyrinths – auch die Stelle,
  an der gerade geschrieben wird. Im Handy-Profil geht sie deshalb nach dem Senden zu.
- Wird das Handy gedreht, während die Tastatur offen ist, entsteht das neue Labyrinth für
  die niedrige Höhe.
- **Querformat am Handy** ist nicht bedacht: das Profil richtet sich nur nach der Breite
  beim Laden, im Querformat passen bei 34 Spalten nur ein bis zwei Textzeilen ins Bild.
- Beim Abschicken einer Frage stockt das Bild einmal kurz (im Headless-Chrome 0,1 bis 0,3 s):
  die neuen Labyrinthe und das nächste Wandbild entstehen in diesem Augenblick.
- Die unterbrochenen Wände erzeugen Rundwege (siehe „Kosten"). Wer das nicht will, stellt
  „Gerade Wand … höchstens" auf 0 – dann bleibt unter der Verbindungsspur eine lange Wand.
- Die Verbindungsspur selbst ist weiterhin gerade, und links neben jeder Folgezeile führt
  ein gerader Gang sechs Zellen hinunter. Die Textzeilen sind im Wandmuster weiterhin an
  ihren vielen senkrechten Strichen zu erahnen.
- Im Schnelldurchlauf blitzt der Rest der alten Antwort kurz auf; „Diese Seite
  überspringen" lässt ihn sogar gleichzeitig aufleuchten.
- Ändert sich die Breite der Bühne, beginnt die aktuelle Antwort von vorn – und zwar mit
  frei gewähltem Eingang statt gegenüber dem letzten Ausgang. Dasselbe bei „Antwort
  nochmal abspielen" und bei jedem Regler, der ein neues Labyrinth verlangt.
- Am Rechner ändert das Auf- und Zuklappen der Regler-Leiste die Breite der Bühne und
  startet die Antwort damit neu.
- Der Stichwort-Abgleich ist grob: „Wie lange …" trifft den Eintrag für den langen
  Testtext. Die Tabelle ist nur ein Platzhalter.
- Ohne Trennstellen-Zeichen wird nach Platz getrennt, nicht nach Silben („CHRIST-IAN").
  Das trifft alle Texte ohne `|`, später also auch die Antworten des Sprachmodells.
- Eine Trennung kann über einen Seitenwechsel fallen – am Desktop bei 1300 px Breite trifft
  das den Einstiegstext der Besucherfassung („INTERNETPRÄ-" ‖ „SENZ VON").
- Kurze Wörter stehen am Handy oft allein in einer Zeile („DIE", „VON", „EIN"); beide
  Texte der Besucherfassung brauchen dort 11 Zeilen und damit zwei Seiten.
- Der Satzpunkt ist klein (so groß wie ein Umlaut-Punkt) und belegt trotzdem vier Spalten.
- Die Besucherfassung enthält im Quelltext weiterhin die versteckte Regler-Leiste und die
  überschriebene Platzhalter-Tabelle aus `config.js` – sichtbar nur für den, der in den
  Quelltext schaut. Mit `?profil=handy` lässt sich auch dort ein Profil erzwingen.
- Der Einstiegstext der Besucherfassung steht an drei Stellen (siehe „Besucherfassung").
- Schrägen gibt es nicht: N und V sind Notlösungen, 0/O, 2/Z und 5/S sehen gleich aus.
- Bei gedeckelter Pixeldichte ist das Bild auf sehr hoch auflösenden Handys leicht weich.
- Das Überstrahlen und das Leuchten der Spur nutzen den Canvas-Schatten; wie flüssig das
  in Firefox oder Safari läuft, ist nicht geprüft.
