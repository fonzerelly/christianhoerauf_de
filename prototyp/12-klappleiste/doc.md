# Prototyp 12: Bühne über der Klappleiste

Wegwerf-Prototyp nach dem Ansehen von Prototyp 11 am 07.11.2026 (Plan:
`docs/frontend/IMPLEMENTATION_PLAN.md`, Schritt 12.0a, Entscheidungen Q41–Q52). Basis ist
Prototyp 11, der zum Vergleich stehen bleibt. Keine Tests (Prototyp).

**Was anders ist als in Prototyp 11:**
- **Keine Reiter.** Die Bühne hat immer dieselbe Höhe und zeigt immer die ganze Labyrinth-Seite;
  der Ausschnitt, der dem Lichtpunkt nachlief, ist weg (er ließ das Labyrinth stottern).
- Die **Zeitleiste** klappt auf und zu. Start aufgeklappt mit der Begrüßung darunter. Zu klappt
  sie, sobald eine Frage abgeschickt oder im Stationsmenü eine Einstiegsfrage gewählt wird; auf
  nur von Hand über den Klappknopf. Er ist der Fuß unter dem Pfeil „›“: beide zusammen sehen aus
  wie ein gespiegeltes L (umrandet, nicht gefüllt), darauf nur ▾ oder ▴. Links neben dem Fuß
  liegt eine eigene Bildlaufleiste, die bündig an ihm endet; links reicht „‹“ ebenso tief, und
  die Leiste beginnt bündig daran. Auf dem Handy fehlen die Pfeile, dort
  bleibt nur der Fuß.
- **Aufgeklappt:** Stationen groß unter der Linie, nebeneinander, Abstände nach Zeit, jede
  mindestens so breit wie ihre Beschriftung; nichts wird nach oben oder unten versetzt. Die
  **Engagements** (Lehre, Ehrenamt, berufsbegleitendes Studium) stehen klein über der Linie: Ein
  dünner Strich zweigt bei ihrem Beginn nach oben ab, oben daneben die Beschriftung. Alle in einer
  Reihe; reicht der Platz bis zum nächsten Engagement nicht, wird sie mit „…“ gekürzt (ganz im
  Tooltip). Keine Balken für die Dauer.
- **Zugeklappt:** eine Zeile „Jahr Name“ mit allen Stationen samt Engagements nach Beginn
  sortiert; Engagements blasser. Ohne Zeitstrahl.
- **Übergang beim Klappen:** Beim Zuklappen fahren die Texte der Stationen und Engagements zu
  ihrem Platz in der Zeile zusammen, während der Zeitstrahl samt Strichen nach links wegwischt;
  beim Aufklappen fahren sie auseinander, und der Zeitstrahl erscheint von links. Die Höhe gleitet
  mit (450 ms). Bei „weniger Bewegung“ im System springt sie ohne Übergang.
- Beide Zustände verschiebbar, seit 1984; beim Laden steht „heute“ am rechten Rand.
- Das **Stationsmenü** liegt immer über Antwort und Fragefeld, auch auf dem Handy.
- **Zeitleiste** samt Knöpfen und **Fragefeld** samt „Senden“ sind genau so breit wie das Labyrinth
  (das aus ganzen Zellen besteht und deshalb etwas schmaler ist als die Bühne); Antwort, Folgefragen
  und Hinweise beginnen an seiner linken Kante.
- **Raster (07.11., nach Ansehen):** Desktop 16 statt 24 px je Zelle, 15 Reihen, die Bühne also
  240 px hoch (wie 10 Reihen à 24 px); Wände, Spur und Leuchten im selben Verhältnis dünner. Handy
  45 Spalten (≈ 8 px) und 18 Reihen, 144 px. Andere Raster im Bedienfeld („Raster am Desktop“,
  „Reihen am Handy“). Bis 17 Reihen passt eine Zeile Stichwort auf eine Seite, ab 18 zwei (die
  Begrüßung „FRAU MUSTER“ am Handy steht dann auf einer Seite).
- **Zwei Durchläufe** statt drei.
- **Gimmicks** (Herz, Smiley, Foto), ausgelöst über drei Knöpfe im Bedienfeld. Herz und Smiley
  zeichnet der Code der echten App (`bilder-der-app.js`). Jedes ist so groß, wie es auf die Bühne
  passt. Mindestens braucht das Foto 10 Reihen, das Herz 15, der Smiley 22; passt es nicht,
  schreibt der Lichtpunkt das Stichwort, und das Bedienfeld sagt, warum.
- Entfallen: Schalter Zeitleiste fest/verschiebbar, Nebenspur, Handy waagrecht/senkrecht, Handy-Menü.

**Wie in Prototyp 11:** Der Lichtpunkt schreibt nur das Stichwort, die Antwort steht als Text
darunter; schneller schreiben und wiederholen (schaltbar); Folgefragen als Knöpfe; Fehler des Bots
als HTTP-Code bzw. OFFLINE oder TIMEOUT. Die übrigen Schalter tragen noch ihre Kennung `p11…`.

**Nicht drin:** echter Bot (Lorem ipsum, der Reihe nach), Pulsieren am Haltepunkt
während des Wartens, Ton.

## Ansehen

```bash
./baue-einzeldatei.sh   # holt den Lebenslauf, schreibt /mnt/share/website/klappleiste/index.html (Foto eingebettet)
```

Bildschirmfotos und Prüfung in Chromium (Playwright im Docker, Bilder nach `bilder/`, nicht
eingecheckt):

```bash
./fotografiere.sh rundgang     # Desktop und Handy durchklicken; Höhen, Breiten, Konsolenfehler
./fotografiere.sh ecken        # Nahaufnahmen beider Ecken der Zeitleiste, auf und zu; Griff ziehen
./fotografiere.sh klappen      # Übergang beim Zu- und Aufklappen in Zeitlupe, je sechs Bilder
./fotografiere.sh gimmicks     # Herz, Smiley, Foto in vier Rastern, je mittendrin und fertig
./fotografiere.sh einzeldatei  # die gebaute Einzeldatei laden, eine Frage stellen, Fehler zählen
```

`bilder-der-app.js` ist erzeugt; nur wenn sich Herz oder Smiley in der App ändern, neu bauen
(braucht `npm install` in `frontend/`):

```bash
./baue-bilder-der-app.sh
```

Die Skripte dazu liegen in `fotos/`. Das Docker-Image nimmt die Version von `playwright-core` aus
`frontend/node_modules`. `klappen` fotografiert mit Firefox: Chromium im Container zeichnet bewegte
Texte mit einer anderen Schrift, als es zum Messen nimmt (sie wirken breiter und überlappen). Ob das
auch im Chrome auf dem Desktop passiert, ist nicht geprüft.

Ganz unten auf der Seite öffnet **Schalter** das Bedienfeld: oben die Schalter dieses Prototyps (rot), darunter
die Regler aus Prototyp 6. Die Beispiel-Links für die Begrüßung stehen unter „Daten und Bot“.

`/lebenslauf` erlaubt nur christianhoerauf.de als Herkunft. Aus dem Prototyp heraus scheitert der
Abruf deshalb, und es gilt der Schnappschuss aus `hole-lebenslauf.sh` (steht in `.gitignore`, das
Repo ist öffentlich). Im echten Frontend gibt es keinen Schnappschuss.

Reihenfolge der Skripte: Prototyp 6 (`config.js` … `einstellungen.js`), `vorher.js`, `seite.js`,
dann Schnappschuss, `inhalte.js`, `buehne.js`, `bilder-der-app.js`, `gimmicks.js`, `zeitleiste.js`,
`oberflaeche.js`. `seite.js`
startet beim Laden sofort; `oberflaeche.js` baut die Begrüßung danach neu.

## Abweichungen und Auslegungen

- **Laufrichtung 3** hieß im Grilling „Zufallsrand“. Zufällige Ränder sind schon Variante 2
  (wie Prototyp 6), deshalb ist 3 hier „hinein und hinaus oben oder unten“.
- **Gleiches Labyrinth bei Wiederholung**: Bei Stichwörtern über mehrere Seiten springt das Bild
  hart auf die erste Seite zurück.
- **Aufgeklappt passt der Beruf auf dem Desktop nicht ganz**: Bei 1440 px sind die sechs
  Beschriftungen zusammen breiter als der Platz, Navigon liegt deshalb halb links außerhalb.
  Größte Breite einer Beschriftung: 220 px (Handy 160 px); längere Titel brechen um.
- **Namen in der zugeklappten Zeile**: Organisation ohne Rechtsform wie in Prototyp 11
  (dort werden auch „Software AG“ und „Automotive GmbH“ abgeschnitten: „Method Park“,
  „Elektrobit“), sonst der Titel („Schulzeit in Schwabach“). Keine Kürzel von Hand.
- **Gekürzte Engagements**: Bei 1440 px wird „Informatik-Kurse an einer Grundschule“ zu
  „Informatik-Kurs…“, weil 2020 schon Ansbach folgt; auf dem Handy noch kürzer. Gekürzt wird am
  Ende per CSS, nicht nach Wörtern.
- **Wo der Fuß des L sitzt**: „vertikal gespiegeltes L“ ist hier als ⅃ gelesen: senkrecht „›“
  rechts, darunter der Fuß, der nach links unter die Zeitleiste ragt. Dafür kommt unter der
  Zeitleiste eine schmale Zeile dazu (22 px, Handy 30 px), in der nur der Fuß steht.
- **Größe der Gimmicks**: In der App nimmt ein Bild zwei Drittel, ein Foto zwei Fünftel der
  kürzeren Seite ein. Auf der flachen Bühne ist das immer die Höhe, und es bliebe kaum etwas übrig
  (bei 15 Reihen ein Herz von 9 Zellen, zu klein). Hier ist jedes Gimmick so groß, wie es passt.
- **Rand um Gimmicks**: oben und unten 1 Reihe frei statt 2 wie um einen Text. Mit 2 bräuchte das
  Herz 17 Reihen. Der Lichtpunkt kommt bei Laufrichtung „gerade“ ohnehin von der Seite, auf Höhe
  der untersten Reihe des Gimmicks.
- **Passt ein Gimmick nicht**, schreibt der Lichtpunkt das Stichwort (in der App: den Antworttext,
  den es auf der Bühne nicht mehr gibt).
- **Foto**: Die Spalte wird gewürfelt wie in der App, senkrecht liegt es mittig (es gibt nur eine
  Reihe Spielraum).

## vorher.js

| Name | Was es tut |
|---|---|
| Config-Änderungen | Bedienfeld an (Knopf „Schalter“), kein „Nochmal“, keine `=`-Testhilfe. Rest-Helligkeit 0 (stehende Buchstaben regelt `buehne.js`), dunkle Ecken 20 %, Bedienfeld beim Laden zu. Desktop: 16 px je Zelle. Handy: 45 Spalten für 10 Zeichen je Zeile (≈ 8 px je Zelle), Wände, Spur und Leuchten entsprechend dünner. |
| `aussehenFuerZellgroesse(zelle)` | Zellgröße samt Wand, Spur, Leuchten, Überstrahlen und Bildstörung, im Verhältnis zu den Grundwerten bei 24 px (Wand und Spur auf halbe Pixel gerundet). Gilt fürs Desktop-Profil; `oberflaeche.js` nimmt es, wenn das Raster umgeschaltet wird. |
| Lauscher „blur“ am Fragefeld | Hält den Lauscher aus `seite.js` auf, der beim Verlassen des Fragefelds nach oben scrollt (iOS-Notlösung aus Prototyp 6). Sonst ging der erste Mausklick auf „Senden“ verloren: Beim Drücken verlor das Feld den Fokus, die Seite sprang, der Knopf rutschte unter dem Zeiger weg. Angemeldet vor `seite.js`, damit `stopImmediatePropagation` greift. |

## inhalte.js

| Name | Was es tut |
|---|---|
| `fnv1a(text)` | FNV-1a mit 32 Bit über die Unicode-Zeichen, wie `personal_link.py`. |
| `pruefsumme(nummer, name)` | Die ersten 4 Hex-Ziffern von `fnv1a("Nummer|Name")`. |
| `lesePersoenlichenLink(fragment)` | Liest den Teil hinter `#`. Liefert `{art: "keiner"}`, `{art: "kaputt"}` oder `{art: "gueltig", nummer, name}`. |
| `BEISPIEL_LINKS` | Die Beispiele aus `backend/schema/personal-link.examples.json` für die Knöpfe im Bedienfeld. |
| `schriftKannNamen(name)` | Ob die Labyrinth-Schrift jedes Zeichen des Namens kennt. |
| `normalisiereFuerSchrift(text)` | Großbuchstaben wie in der Schrift („ß“ wird „SS“). |
| `anredeUndNachname(name)` | „Frau Erika Muster“ → „Frau Muster“; ohne Anrede bleibt der Name. |
| `stichwortDerBegruessung(link, profilName)` | Desktop „HALLO\nFRAU MUSTER“ (erzwungener Umbruch), Handy „FRAU MUSTER“. Ohne gültigen Link oder mit unbekannten Zeichen „HALLO“. |
| `textDerBegruessung(link)` | Die Absätze der Begrüßung (Entwurf, Christian gibt ihn frei); bei kaputtem Link ein Satz dazu. |
| `loremMitLaenge(zeichen)` | Lorem ipsum, das vor der Länge an einem Wortende mit Punkt aufhört. |
| `VORGETAEUSCHTE_ANTWORTEN` | Sieben Antworten von 120 bis 600 Zeichen mit kurzen, zu langen und fehlenden Stichwörtern und 0–3 Folgefragen. |
| `fehlerAntwort(code)` | Text und Stichwort für einen Fehler: HTTP-Code, `OFFLINE` oder `TIMEOUT`. |
| `warte(ms)` | Ein Versprechen, das nach der Zeit erfüllt ist. |
| `frageVorgetaeuschtenBot(fehlerart)` | Nach 0,8–2,2 s die nächste Antwort der Reihe, oder der gewählte Fehler; `TIMEOUT` nach 4 s. |
| `GIMMICK_ANTWORTEN` | Je eine Antwort mit Herz, Smiley und Foto: Stichwort (falls das Gimmick nicht passt), Gimmick, kurzer Text. |

## buehne.js

Ersetzt Funktionen aus `seite.js` und `labyrinth.js` durch Zuweisung.

| Name | Was es tut |
|---|---|
| `SCHALTER` | Höhe der Bühne in Reihen, Laufrichtung, Lage, Tempo, Pause, Durchläufe, gleiches/neues Labyrinth, stehen bleiben. Hält `oberflaeche.js` aktuell. |
| `bewegungReduziert` | `prefers-reduced-motion`: ein Durchlauf, Wort bleibt stehen. |
| `begrenze(wert, min, max)` | Klemmt einen Wert ein. |
| `normalizeText` (ersetzt) | Normalisiert jede Zeile einzeln, damit ein `\n` erhalten bleibt. |
| `wrapText` (ersetzt) | Bricht jeden Teil zwischen zwei `\n` für sich um. |
| `fitCanvasToStage` (ersetzt) | Setzt die Höhe der Bühne auf `SCHALTER.reihen` Zellen (Zellgröße aus der Breite), dann wie bisher. |
| `layoutGrid` (ersetzt) | Wie bisher, aber genau `SCHALTER.reihen` Reihen und oben bündig. Trägt `--labyrinth-links` und `--labyrinth-breite` an `#seite` ein; danach richten sich Zeitleiste, Fragefeld und Antwort im CSS. |
| `seitenPlan` | Was beim Bau der aktuellen Seite gilt (Lage, feste Randreihe); lesen die ersetzten Funktionen aus `labyrinth.js`. |
| `ersterEingang(block, random)` | Eingang der ersten Seite je Laufrichtung: links auf Höhe der Schrift, links auf Zufallshöhe, oben/unten oder zufällig wie Prototyp 6. |
| `optionenDerLaufrichtung(settings)` | Ausgangsseite und Umwege je Laufrichtung. |
| `buildAnswerPages` (ersetzt) | Wie `generateMessagePages`: ein Stichwort in einer Zeile, die Begrüßung bis zu zwei (wie viele auf eine Seite passen, entscheidet `textCapacity` nach der Höhe); eigener Startwert je Durchlauf, Lage des Worts, Ein- und Ausgang nach Schaltern. Merkt die Seiten an der Antwort. |
| `layoutTextBlock` (ersetzt) | Block mittig, links oder rechts (Abstand 8 % der Breite, mindestens 4 Spalten). |
| `appendTextRoute` (ersetzt) | Wie in `labyrinth.js`, nur stehen die Zeilen im Block links-, rechtsbündig oder mittig. |
| `pickBorderCell` (ersetzt) | Bei Laufrichtung „gerade“ liegen Ein- und Ausgang links/rechts auf Höhe der Schrift, sonst wie bisher. |
| `pickExit` (ersetzt) | Versteht zusätzlich „obenunten“ (Laufrichtung 3). |
| `paceOf` (ersetzt) | Tempo mal Tempo-Faktor. |
| `durchlaeufeFuer(antwort)` | Wie oft geschrieben wird; ein Pfad ohne Stichwort und reduzierte Bewegung nur einmal, 0 = endlos. |
| `istLetzterLauf(antwort)` | Ob der aktuelle Durchlauf der letzte ist. |
| `wortBleibtStehen(seite)` | „immer“, „nie“ oder erst im letzten Durchlauf. |
| `einstellungenMitRest(settings, mitRest)` | Die Einstellungen mit Rest-Helligkeit 1 oder 0, je Einstellungsstand nur einmal angelegt. |
| `brightnessLevelOf` (ersetzt) | Buchstaben und Umlaut-Punkte bleiben bei Bedarf voll stehen, Verbindungswege verglimmen immer. |
| `firstGlowingStep` (ersetzt) | Bei stehenden Buchstaben ab Schritt 1, sonst wie bisher. |
| `speakAnswer` (ersetzt) | Tut nichts: Die Antwort steht als HTML im Antwortbereich. |
| `starteNaechstenLauf(antwort)` | Nächster Durchlauf: dasselbe Labyrinth von vorn, oder neue Seiten, zu denen das Bild weiterschiebt. |
| `pruefeWiederholung()` | Ist die Antwort fertig und die Pause um, startet der nächste Durchlauf, solange es noch einen gibt. |
| `buehneNeuAufbauen()` | Baut die aktuelle Antwort mit den jetzigen Schaltern neu und schreibt sie von vorn (auch nach einer anderen Höhe). |
| `jedesBildDerBuehne()` | Läuft in jedem Bild und prüft die Wiederholung. |

## gimmicks.js

Nach `buehne.js` geladen; ersetzt `buildAnswerPages`, `createAnswer` und `drawPage` noch einmal
durch Zuweisung. Route und Seite sind aus `route-builder.ts` und `maze-page-generator.ts` der App
übertragen, mit den Bausteinen aus Prototyp 6.

| Name | Was es tut |
|---|---|
| `fotoVonChris` | Das Foto aus `frontend/src/assets/chris.jpg` (in der Einzeldatei als data:-Adresse). Zeichnet neu, sobald es geladen ist. |
| `reihenFuerBild(bild)` | Höhe des Bilds + 3 Reihen für An- und Ablauf + je 1 Reihe frei oben und unten. |
| `platziereBild(name, cols, rows)` | Das breiteste Bild mit ungerader Breite, das passt (höchstens so breit wie die Bühne ohne je 3 Spalten Rand), waagrecht und senkrecht mittig. `null`, wenn selbst die kleinste Größe aus der App (Herz 11, Smiley 17) nicht passt. |
| `platziereFoto(cols, rows, random)` | Das größte quadratische Foto, das samt Rahmen passt; Spalte gewürfelt, senkrecht mittig. `null` unter 6 Zellen. |
| `mindestReihen(gimmick)` | Wie viele Reihen das Gimmick mindestens braucht (Foto 10, Herz 15, Smiley 22). |
| `setzeRouteZusammen(…)` | Wie `buildRoute` in Prototyp 6 bzw. `assemble` in der App: zwei Schritte außerhalb, Anlauf in Windungen zum linken Tor, die Mitte, Ablauf in Windungen vom rechten Tor zum Ausgang, zwei Schritte hinaus. |
| `blockFuerBild(platz)` | Das Rechteck aus Bild und den 3 Reihen darunter; um ihn herum teilen sich Anlauf und Ablauf das Labyrinth. |
| `routeFuerBild(…)` | Wie `buildPicture`: in der untersten Reihe des Blocks von links heran, senkrecht hinauf zum Anfang des Bilds, das Bild (Wegpunkte aus der App), eine Reihe unter das Bild und darin nach rechts hinaus. |
| `rahmenUm(foto)` | Die Zellen direkt um das Foto. |
| `routeFuerFoto(…)` | Wie `buildPhoto`: unten links an den Rahmen, dreimal herum (Schriftwege), unten nach rechts hinaus. Merkt am Foto in `rundenEnden`, wo jede Runde endet. |
| `oeffneRaum(maze, foto)` | Nimmt alle Wände zwischen den Zellen unter dem Foto weg; die nach außen bleiben. |
| `generiereGimmickSeite(plan, …)` | Wie `generatePage`: Ausgang, Route, freibrechen, beim Foto den Raum öffnen, den Rest wachsen lassen. Keine Zeilen. |
| `planeGimmick(gimmick, random)` | `{bild}`, `{foto}` oder `null`, wenn es nicht passt. |
| `anlaufReiheVon(plan)` | Die unterste Reihe des Gimmicks; dort liegen bei Laufrichtung „gerade“ Ein- und Ausgang. |
| `createAnswer` (ersetzt) | Wie bisher, trägt das vorgemerkte Gimmick an der Antwort ein. |
| `zeigeAntwortMitGimmick(stichwort, frage, gimmick)` | Merkt das Gimmick vor und ruft `showAnswer`. |
| `buildAnswerPages` (ersetzt) | Mit Gimmick, das passt: genau eine Seite damit, Eingang gegenüber dem vorigen Ausgang bzw. links auf Höhe der untersten Reihe. Sonst wie in `buehne.js` (Stichwort). Wiederholung und Stehenbleiben wie beim Stichwort. |
| `zeigeGimmickHinweis(gimmick, passt)` | Schreibt ins Bedienfeld, ob es passt bzw. wie viele Reihen fehlen. |
| `verkleinertesFoto(bloecke)` | Das Foto auf `bloecke` × `bloecke` Pixel verkleinert, je Größe einmal. |
| `zeichneFoto(seite, settings)` | Wie `PhotoPainter`: Foto im Rahmen, um die halbe Wandbreite eingerückt; vor der ersten Runde Blöcke von 2 Zellen, dann 1, dann ½, nach der dritten scharf. |
| `drawPage` (ersetzt) | Auf Seiten mit Foto: Wände, Foto, dann Spur und Lichtpunkt. |

## bilder-der-app.js, baue-bilder-der-app.sh

Erzeugt von `baue-bilder-der-app.sh` mit `rolldown` aus `frontend/node_modules`: bündelt
`drawPicture` und `SMALLEST_SIZE` aus `frontend/src/domain/picture/` zu einem Skript ohne Module
mit der globalen Variable `BILDER_DER_APP`. Nicht von Hand ändern.

## zeitleiste.js

| Name | Was es tut |
|---|---|
| `ZEITLEISTE` | Schalter: Laden echt/langsam/Fehler. |
| `zeitleistenStand` | Ob geladen wird, die Daten da sind oder der Abruf gescheitert ist; ob aufgeklappt. |
| `BESCHRIFTUNG_HOECHSTENS`, `BESCHRIFTUNG_LUFT`, `PIXEL_JE_JAHR_MINDESTENS`, `PLATZ_FUER_HEUTE`, `ENGAGEMENT_HOEHE`, `ENGAGEMENT_MINDESTBREITE` | Größte Breite einer Beschriftung (220/160 px), Luft dazwischen, engster Maßstab (34/22 px je Jahr), Platz für „heute“, Höhe des Strichs eines Engagements (24 px), schmalste gekürzte Beschriftung (40 px). |
| `istHandy()`, `profilDerZeitleiste()` | Ob das Geräteprofil „handy“ gilt; „handy“ oder „desktop“. |
| `heuteAlsJahr()` | Das heutige Datum als Jahr mit Nachkommastellen. |
| `jahrAus(teil, istEnde)` | „10/2020“, „2014“ oder „heute“ als Jahr; ein Ende ohne Monat liegt in der Jahresmitte. |
| `zeitraumAus(text)` | „2011 – 2014“ → `{von, bis}`. |
| `nameDerOrganisation(eintrag)` | Die Organisation, wenn sie ein Name ist (groß geschrieben; „ehrenamtlich“ nicht). |
| `kurzname(station)` | Für die zugeklappte Zeile: Organisation ohne Rechtsform („TeamBank AG“ → „TeamBank“), sonst der Titel. |
| `jahrDerBeschriftung(station)` | Die erste Jahreszahl des Zeitraums. |
| `stationenAus(daten)` | Verteilt alle datierten Einträge: `hauptspur` (was vor dem ersten Beruf endete, dann der Beruf) und `engagements` (was nicht Beruf ist und nicht vorher endete). Projekte haben keine Daten und fehlen. |
| `beschriftungDesEngagements(station)` | „Betriebswirtschaftslehre · FernUniversität in Hagen“: Titel bis zum ersten Komma, dazu die Organisation. |
| `holeLebenslauf()` | Holt `/lebenslauf` (mit `?variante=` aus dem Link), notfalls den Schnappschuss; „langsam“ wartet 3 s, „fehler“ scheitert. |
| `ladeZeitleiste()` | Zeigt „wird geladen“, holt die Daten und zeichnet mit Aufbau oder zeigt den Fehler mit „Nochmal versuchen“. |
| `abschnitteDer(stationen, mindestBreiten)` | Jede Station reicht bis zum Beginn der nächsten, die letzte bis heute; dazu ihre Mindestbreite. |
| `pixelJeJahr(abschnitte, breite)` | Maßstab, so dass die Abschnitte die Breite füllen und keiner schmaler als seine Mindestbreite wird. Passen die Mindestbreiten nicht, wird die Zeitleiste breiter als der Platz. |
| `legeAbschnitte(abschnitte, jeJahr)` | Legt die Abschnitte nebeneinander (`x`, `breite`). |
| `xFuerJahr(jahr, gelegt)` | Wo ein Zeitpunkt liegt, anteilig in seinem Abschnitt; so stehen die Engagements über der richtigen Stelle. |
| `element(tag, klasse, text)` | Legt ein Element an. |
| `menueKnopfFuer(station, klasse, text)` | Ein Knopf mit `aria-expanded`, der das Stationsmenü öffnet. |
| `stationsKnopf(station)` | Knopf mit Jahr, Organisation und Titel unter der Linie. |
| `zeichneZeitleiste(mitAufbau)` | Laden, Fehler oder der Rahmen `‹ Inhalt ›` mit dem Klappknopf als Fuß unter `›` (CSS-Raster) und aufgeklapptem oder zugeklapptem Inhalt. Pfeile und Ziehen nur, wenn der Inhalt breiter ist als der Platz; dann steht „heute“ rechts am Rand. |
| `zeichneAufgeklappt(scroll, mitAufbau)` | Legt alles ins Dokument, misst die Beschriftungen, rechnet den Maßstab (der Beruf füllt die Breite, davor im selben Maßstab), setzt jedes Engagement mit seinem Strich an das Jahr seines Beginns und begrenzt seine Beschriftung bis kurz vor das nächste (das letzte bis zum Ende des Inhalts), dann Linie, „heute“ und Stationen. |
| `zeichneZugeklappt(scroll)` | Eine Zeile „Jahr Name“ nach Beginn sortiert (bei gleichem Beginn der Beruf vorn), Engagements blasser, am Ende „heute“. |
| `setzeZeitleisteAufgeklappt(aufgeklappt)` | Hält das Bild des alten Zustands fest, zeichnet den neuen und spielt den Übergang (nicht bei „weniger Bewegung“). Ein laufender Übergang wird vorher beendet. |
| `UEBERGANG_DAUER`, `UEBERGANG_KURVE`, `STILE_DES_ABBILDS` | 450 ms, Kurve des Übergangs; die Eigenschaften, die ein Abbild fest mitbekommt, weil die CSS-Regeln am Ort hängen. |
| `abbildVon(original)` | Kopie eines Elements für die Ebene über der Zeitleiste: gleicher Inhalt, Schrift, Farbe und Innenabstand fest eingetragen, nicht bedienbar. |
| `bildDerZeitleiste()` | Hält fest, wie die Zeitleiste gerade aussieht: Höhe, sichtbarer Bereich, je Eintrag mit `data-uebergang` Lage und Abbild, aufgeklappt dazu das Gerippe (Linie und Striche, Texte unsichtbar, damit die Striche ihre Höhe behalten). |
| `setzeAuf(ebene, element, lage)` | Stellt ein Abbild an eine Stelle in Fensterkoordinaten, umgerechnet auf die Ebene. |
| `spieleUebergang(vorher)` | Versteckt den neu gezeichneten Inhalt und legt eine Ebene darüber: Die Höhe der Zeitleiste gleitet, das Gerippe wischt weg oder herein (clip-path), und je Eintrag fahren altes und neues Abbild gemeinsam von der alten an die neue Stelle, das alte blendet aus, das neue ein. Einträge nur auf einer Seite (die Punkte der Zeile) blenden an Ort und Stelle. Danach Ebene weg, Inhalt sichtbar. |
| `beendeUebergang()` | Bricht einen laufenden Übergang ab und zeigt sofort den Endzustand (vor jedem Neuzeichnen). |
| `klappknopfFuer(aufgeklappt)` | Der Fuß des L: nur ▴ (zuklappen) bzw. ▾ (aufklappen), Wortlaut in `aria-label`, dazu `aria-expanded`. Behält nach dem Klick den Fokus. |
| `setzeZeitleisteAufgeklappt(aufgeklappt)` | Klappt um, zeichnet neu und blendet weich ein. Die Bühne bleibt, was darunter steht, rutscht mit. |
| `bildlaufleisteFuer(scroll)` | Eigene Bildlaufleiste neben dem Fuß (die des Browsers ist ausgeblendet, sie lässt sich nicht dorthin legen): Bahn mit Griff so breit wie der sichtbare Anteil (mindestens 24 px). Griff ziehen mit Maus oder Finger; Klick auf die Bahn springt mit der Griffmitte dorthin. `anpassen()` setzt Breite und Lage nach jedem Verschieben. Für Screenreader verborgen, die Pfeilknöpfe übernehmen. |
| `pfeilKnopf(..., klasse)` | Knopf („frueher“ oder „spaeter“, legt den Platz im Raster fest), der die Zeitleiste um 60 % ihrer Breite verschiebt (auf dem Handy ausgeblendet, dort wischt man). |
| `macheZiehbar(scroll)` | Ziehen mit der Maus; wer gezogen hat, öffnet dabei kein Menü. |
| `zeigeAufbau(inhalt, mitAufbau)` | Startet das Ziehen der Linie und das Einblenden (bei reduzierter Bewegung sofort). |
| `einstiegsfragen(station)` | „Was hat Chris bei <Firma> gemacht?“ und je Stichpunkt „Erzähl mir mehr über „…“ bei <Firma>.“ |
| `oeffneStationsMenue(station, knopf)` | Füllt das Menü und legt es über die Seite unter den Knopf, innerhalb des Fensters. Zweiter Klick schließt. |
| `waehleEinstiegsfrage(frage)` | Trägt die Frage ins Fragefeld ein (schickt nicht ab), schließt das Menü, klappt die Zeitleiste zu, Fokus ins Fragefeld. |
| `schliesseStationsMenue()` | Schließt das Menü. Esc, Klick daneben, Scrollen der Zeitleiste und Neuzeichnen schließen es ebenfalls. |
| Lauscher „resize“ | Zeichnet nur bei anderer **Breite** neu (am Handy ändert die Adressleiste die Höhe). |

## oberflaeche.js

| Name | Was es tut |
|---|---|
| `profilName()` | „handy“ oder „desktop“. |
| `absatz(text, klasse)` | Ein `<p>`. |
| `zeigeAntwort(frage, absaetze)` | Frage klein, darunter die Antwort; eine neue ersetzt die alte. |
| `zeigeWarten(frage)` | Neue Frage steht da, „Der Bot denkt nach …“, alte Antwort blass. |
| `setzeFolgefragen(fragen)` | Knöpfe über dem Fragefeld; Klick trägt nur ein. |
| `zeigeAntwortImBild()` | Scrollt zur Antwort, wenn sie nicht gut zu sehen ist. |
| `stelleFrage(frage, gimmick)` | Klappt die Zeitleiste zu, fragt den vorgetäuschten Bot (mit `gimmick` nach 0,8 s die Antwort aus `GIMMICK_ANTWORTEN`), zeigt die Antwort, lässt das Stichwort schreiben bzw. das Gimmick zeichnen. Überholte Antworten werden verworfen. |
| Absenden (Lauscher) | Fängt das Absenden vor `seite.js` ab. |
| `wertVon(id)`, `leseSchalter()` | Liest das Bedienfeld in `SCHALTER` und `ZEITLEISTE`; die Reihen je nach Profil aus „Raster am Desktop“ oder „Reihen am Handy“. |
| `rasterAmDesktop()` | Liest „Raster am Desktop“: aus „16x15“ wird `{zelle: 16, reihen: 15}`. |
| `wendeEckenAn()` | „Dunkle Ecken“ stellt den Regler aus Prototyp 6 und meldet ihm die Änderung. |
| Schalter-Lauscher | Übernehmen Änderungen. „Raster am Desktop“ trägt Zellgröße und Aussehen ins Desktop-Profil ein und wendet es neu an (dann `wendeEckenAn`); „Reihen am Handy“ baut die aktuelle Antwort sofort neu. Ein anderes Profil von Hand baut Bühne und Zeitleiste neu. |
| Gimmick-Knöpfe | Stellen die Frage „Gimmick: Herz“ usw. mit dem Gimmick. |
| `starteSeite()` | Schalter lesen, Begrüßung als erste Antwort (bis zu zwei Zeilen) bauen, Zeitleiste aufgeklappt laden. |
