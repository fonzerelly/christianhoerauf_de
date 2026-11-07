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
  sortiert; Engagements blasser.
- Beide Zustände verschiebbar, seit 1984; beim Laden steht „heute“ am rechten Rand.
- Das **Stationsmenü** liegt immer über Antwort und Fragefeld, auch auf dem Handy.
- **Zeitleiste** samt Knöpfen und **Fragefeld** samt „Senden“ sind genau so breit wie das Labyrinth
  (das aus ganzen Zellen besteht und deshalb etwas schmaler ist als die Bühne); Antwort, Folgefragen
  und Hinweise beginnen an seiner linken Kante.
- Schalter „Höhe der Bühne“: 10, 14 (Start) oder 18 Reihen. Bei 10 und 14 passt eine Zeile
  Stichwort auf eine Seite, bei 18 zwei; die Begrüßung „HALLO / FRAU MUSTER“ läuft sonst über zwei
  Seiten.
- Entfallen: Schalter Zeitleiste fest/verschiebbar, Nebenspur, Handy waagrecht/senkrecht, Handy-Menü.

**Wie in Prototyp 11:** Der Lichtpunkt schreibt nur das Stichwort, die Antwort steht als Text
darunter; schneller schreiben und wiederholen (schaltbar); Folgefragen als Knöpfe; Fehler des Bots
als HTTP-Code bzw. OFFLINE oder TIMEOUT. Die übrigen Schalter tragen noch ihre Kennung `p11…`.

**Nicht drin:** echter Bot (Lorem ipsum, der Reihe nach), Gimmicks, Pulsieren am Haltepunkt
während des Wartens, Ton.

## Ansehen

```bash
./baue-einzeldatei.sh   # holt den Lebenslauf und schreibt /mnt/share/website/klappleiste/index.html
```

Bildschirmfotos und Prüfung in Chromium (Playwright im Docker, Bilder nach `bilder/`, nicht
eingecheckt):

```bash
./fotografiere.sh rundgang     # Desktop und Handy durchklicken; Höhen, Breiten, Konsolenfehler
./fotografiere.sh ecken        # Nahaufnahmen beider Ecken der Zeitleiste, auf und zu; Griff ziehen
./fotografiere.sh einzeldatei  # die gebaute Einzeldatei laden, eine Frage stellen, Fehler zählen
```

Die Skripte dazu liegen in `fotos/`. Das Docker-Image nimmt die Version von `playwright-core` aus
`frontend/node_modules`.

Ganz unten auf der Seite öffnet **Schalter** das Bedienfeld: oben die Schalter dieses Prototyps (rot), darunter
die Regler aus Prototyp 6. Die Beispiel-Links für die Begrüßung stehen unter „Daten und Bot“.

`/lebenslauf` erlaubt nur christianhoerauf.de als Herkunft. Aus dem Prototyp heraus scheitert der
Abruf deshalb, und es gilt der Schnappschuss aus `hole-lebenslauf.sh` (steht in `.gitignore`, das
Repo ist öffentlich). Im echten Frontend gibt es keinen Schnappschuss.

Reihenfolge der Skripte: Prototyp 6 (`config.js` … `einstellungen.js`), `vorher.js`, `seite.js`,
dann Schnappschuss, `inhalte.js`, `buehne.js`, `zeitleiste.js`, `oberflaeche.js`. `seite.js`
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

## vorher.js

| Name | Was es tut |
|---|---|
| Config-Änderungen | Bedienfeld an (Knopf „Schalter“), kein „Nochmal“, keine `=`-Testhilfe. Rest-Helligkeit 0 (stehende Buchstaben regelt `buehne.js`), dunkle Ecken 20 %, Bedienfeld beim Laden zu. Handy: 45 Spalten für 10 Zeichen je Zeile (≈ 8 px je Zelle), Wände, Spur und Leuchten entsprechend dünner. |

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
| `stelleFrage(frage)` | Klappt die Zeitleiste zu, fragt den vorgetäuschten Bot, zeigt die Antwort, lässt das Stichwort schreiben. Überholte Antworten werden verworfen. |
| Absenden (Lauscher) | Fängt das Absenden vor `seite.js` ab. |
| `wertVon(id)`, `leseSchalter()` | Liest das Bedienfeld in `SCHALTER` und `ZEITLEISTE`. |
| Schalter-Lauscher | Übernehmen Änderungen; „Höhe der Bühne“ baut die aktuelle Antwort sofort neu; „Dunkle Ecken“ stellt den Regler aus Prototyp 6. |
| `starteSeite()` | Schalter lesen, Begrüßung als erste Antwort (bis zu zwei Zeilen) bauen, Zeitleiste aufgeklappt laden. |
