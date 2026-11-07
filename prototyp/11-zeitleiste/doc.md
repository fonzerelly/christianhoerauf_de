# Prototyp 11: Bühne über der Zeitleiste

Wegwerf-Prototyp zum Grilling vom 06./07.11.2026 (Plan: `docs/frontend/IMPLEMENTATION_PLAN.md`,
Schritt 12.0; Brief und Skizzen: `docs/frontend/neuausrichtung/`). Er soll zeigen, welche Varianten
im Browser tragen, bevor das Frontend mit TDD umgebaut wird. Keine Tests (Prototyp).

**Was er zeigt:**
- Zwei Ansichten über Reiter: **Werdegang** (hohe Bühne, Zeitleiste mit Stationen, Begrüßung) und
  **Gespräch** (niedriger Ausschnitt der Bühne, Jahreszeile, aktuelle Antwort). Wer fragt, landet im Gespräch.
- Der Lichtpunkt schreibt nur das **Stichwort**, die Antwort steht sofort als Text darunter.
- Jede Labyrinth-Seite ist 18 Reihen hoch (zwei Zeilen Stichwort). Das Gespräch zeigt davon
  10 Reihen; dieser **Ausschnitt** folgt dem Lichtpunkt.
- Schneller schreiben und wiederholen, danach bleibt das Wort stehen (alles schaltbar).
- **Zeitleiste** aus `/lebenslauf`: fest oder verschiebbar, mit oder ohne Nebenspur, am Handy
  waagrecht oder senkrecht. Klick auf eine Station öffnet das **Stationsmenü** mit Einstiegsfragen.
- Folgefragen als Knöpfe über dem Fragefeld (tragen nur ein).
- Fehler des Bots: Der Punkt schreibt den HTTP-Code bzw. OFFLINE oder TIMEOUT.

**Nicht drin:** echter Bot (Lorem ipsum, der Reihe nach), Gimmicks, Pulsieren am Haltepunkt
während des Wartens, Ton.

## Ansehen

```bash
./baue-einzeldatei.sh   # holt den Lebenslauf und schreibt /mnt/share/website/zeitleiste/index.html
```

Unten rechts öffnet **Schalter** das Bedienfeld: oben die Schalter dieses Prototyps (rot), darunter
die Regler aus Prototyp 6. Die Beispiel-Links für die Begrüßung stehen unter „Daten und Bot“.

`/lebenslauf` erlaubt nur christianhoerauf.de als Herkunft. Aus dem Prototyp heraus scheitert der
Abruf deshalb, und es gilt der Schnappschuss aus `hole-lebenslauf.sh` (steht in `.gitignore`, das
Repo ist öffentlich). Im echten Frontend gibt es keinen Schnappschuss.

Reihenfolge der Skripte: Prototyp 6 (`config.js` … `einstellungen.js`), `vorher.js`, `seite.js`,
dann Schnappschuss, `inhalte.js`, `buehne.js`, `zeitleiste.js`, `oberflaeche.js`. `seite.js`
startet beim Laden sofort; `oberflaeche.js` baut die Begrüßung danach neu.

## Abweichungen und Auslegungen

- **Laufrichtung 3** hieß im Grilling „Zufallsrand“. Zufällige Ränder sind schon Variante 2
  (wie Prototyp 6), deshalb ist 3 hier „hinein und hinaus oben oder unten“. Bei 2 und 3 verlässt
  die Route das Band, und der Ausschnitt im Gespräch fährt dem Punkt hinterher.
- **Gleiches Labyrinth bei Wiederholung**: Bei Stichwörtern über mehrere Seiten springt das Bild
  hart auf die erste Seite zurück.
- Ein- und Ausgänge links oder rechts liegen immer im Band (Reihen 4–13), auch bei der
  zweizeiligen Begrüßung. Sonst begänne die erste Antwort im Gespräch außerhalb des Ausschnitts.

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
| `ZEILEN`, `ZEILEN_IM_GESPRAECH`, `BAND` | 18 Reihen je Seite, 10 im Ausschnitt; das Band sind die Reihen 4–13 in der Mitte. |
| `SCHALTER` | Laufrichtung, Lage, Tempo, Pause, Durchläufe, gleiches/neues Labyrinth, stehen bleiben. Hält `oberflaeche.js` aktuell. |
| `bewegungReduziert` | `prefers-reduced-motion`: ein Durchlauf, Wort bleibt stehen. |
| `ansicht` | „werdegang“ oder „gespraech“. |
| `begrenze(wert, min, max)` | Klemmt einen Wert ein. |
| `normalizeText` (ersetzt) | Normalisiert jede Zeile einzeln, damit ein `\n` erhalten bleibt. |
| `wrapText` (ersetzt) | Bricht jeden Teil zwischen zwei `\n` für sich um. |
| `fitCanvasToStage` (ersetzt) | Setzt die Höhe der Bühne auf 18 Zellen (Zellgröße aus der Breite), dann wie bisher. |
| `layoutGrid` (ersetzt) | Wie bisher, aber genau 18 Reihen und oben bündig. |
| `seitenPlan` | Was beim Bau der aktuellen Seite gilt (Lage, einzeilig, feste Randreihe, im Band); lesen die ersetzten Funktionen aus `labyrinth.js`. |
| `ersterEingang(block, random)` | Eingang der ersten Seite je Laufrichtung: links auf Höhe der Schrift, links auf Zufallshöhe im Band, oben/unten oder zufällig wie Prototyp 6. |
| `optionenDerLaufrichtung(settings)` | Ausgangsseite und Umwege je Laufrichtung. |
| `buildAnswerPages` (ersetzt) | Wie `generateMessagePages`: Zeilen je Seite nach Ansicht beim ersten Bau (Werdegang 2, Gespräch 1, bleibt an der Antwort), eigener Startwert je Durchlauf, Lage des Worts, Ein- und Ausgang nach Schaltern. Merkt die Seiten an der Antwort. |
| `layoutTextBlock` (ersetzt) | Block mittig, links oder rechts (Abstand 8 % der Breite, mindestens 4 Spalten). |
| `appendTextRoute` (ersetzt) | Wie in `labyrinth.js`, nur stehen die Zeilen im Block links-, rechtsbündig oder mittig. |
| `pickBorderCell` (ersetzt) | Ein- und Ausgänge links/rechts immer im Band; bei „gerade“ auf Höhe der Schrift. |
| `pickExit` (ersetzt) | Versteht zusätzlich „obenunten“ (Laufrichtung 3). |
| `liegtSeitlichImBand(oeffnung)` | Ob ein Ein- oder Ausgang links/rechts im Band liegt. |
| `createTerritories` (ersetzt) | Einzeilige Seite mit Ein- und Ausgang seitlich im Band: Anlauf und Ablauf dürfen das Band nicht verlassen. Trägt `imBand` in den Plan ein. |
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
| `zielDesAusschnitts(sichtbareZeilen)` | Werdegang: oben. Gespräch: das Band, wenn die Route darin bleibt, sonst die Reihe des Punkts in die Mitte. |
| `folgeDemPunkt(sekunden)` | Lässt den Ausschnitt dem Ziel nachgleiten, verschiebt die Bühne und setzt die Höhe des Ausschnitts (gleitet per CSS). |
| `setzeAnsichtDerBuehne(name)` | Merkt sich die Ansicht. |
| `buehneNeuAufbauen()` | Baut die aktuelle Antwort mit den jetzigen Schaltern neu und schreibt sie von vorn. |
| `jedesBildDerBuehne(jetzt)` | Läuft in jedem Bild: Wiederholung prüfen, Ausschnitt nachführen. |

## zeitleiste.js

| Name | Was es tut |
|---|---|
| `ZEITLEISTE` | Schalter: fest/verschiebbar, Nebenspur, Handy waagrecht/senkrecht, Menü schiebt/schwebt, Laden echt/langsam/Fehler. |
| `zeitleistenStand` | Ob geladen wird, die Daten da sind oder der Abruf gescheitert ist. |
| `istHandy()` | Ob das Geräteprofil „handy“ gilt. |
| `heuteAlsJahr()` | Das heutige Datum als Jahr mit Nachkommastellen. |
| `jahrAus(teil, istEnde)` | „10/2020“, „2014“ oder „heute“ als Jahr; ein Ende ohne Monat liegt in der Jahresmitte. |
| `zeitraumAus(text)` | „2011 – 2014“ → `{von, bis}`. |
| `nameDerOrganisation(eintrag)` | Die Organisation, wenn sie ein Name ist (groß geschrieben; „ehrenamtlich“ nicht). |
| `kurzname(station)` | Für die Jahreszeile ohne Rechtsform („TeamBank AG“ → „TeamBank“). |
| `jahrDerBeschriftung(station)` | Die erste Jahreszahl des Zeitraums. |
| `stationenAus(daten)` | Verteilt alle datierten Einträge: Beruf, was davor endete (vorher), was daneben lief (Nebenspur). Projekte haben keine Daten und fehlen. |
| `hauptspur()` | Fest: der Beruf. Verschiebbar: alles von der Schule an. |
| `holeLebenslauf()` | Holt `/lebenslauf` (mit `?variante=` aus dem Link), notfalls den Schnappschuss; „langsam“ wartet 3 s, „fehler“ scheitert. |
| `ladeZeitleiste()` | Zeigt „wird geladen“, holt die Daten und zeichnet mit Aufbau oder zeigt den Fehler mit „Nochmal versuchen“. |
| `abschnitteDer(stationen)` | Jede Station reicht bis zum Beginn der nächsten, die letzte bis heute. |
| `pixelJeJahr(abschnitte, breite, mindestens)` | Maßstab, so dass die Abschnitte die Breite füllen und keiner schmaler als die Mindestbreite wird. |
| `legeAbschnitte(abschnitte, jeJahr, mindestens)` | Legt die Abschnitte nebeneinander (`x`, `breite`). |
| `xFuerJahr(jahr, gelegt)` | Wo ein Zeitpunkt liegt, anteilig in seinem Abschnitt; so passen die Balken der Nebenspur zu den Stationen. |
| `element(tag, klasse, text)` | Legt ein Element an. |
| `stationsKnopf(station)` | Knopf mit Jahr, Organisation und Titel, der das Stationsmenü öffnet. |
| `zeichneZeitleiste(mitAufbau)` | Je nach Zustand und Ansicht: Laden, Fehler, Jahreszeile, Liste oder waagrecht. |
| `zeichneWaagrecht(mitAufbau)` | Achse, Stationen nach Zeit (Maßstab immer vom Beruf), „heute“, Nebenspur, „vorher“; Pfeile und Ziehen nur, wenn sie breiter ist als der Platz. |
| `versetzeEngeBeschriftungen(inhalt)` | Ragt eine Beschriftung in die nächste, rutscht die nächste tiefer (abwechselnd). |
| `zeichneNebenspur(inhalt, neben, gelegt, oben)` | Je Eintrag ein dünner Balken über die Dauer; überschneiden sich Beschriftungen, eine Bahn tiefer. |
| `pfeilKnopf(...)` | Knopf, der die Zeitleiste um 60 % ihrer Breite verschiebt. |
| `macheZiehbar(scroll)` | Ziehen mit der Maus; wer gezogen hat, öffnet dabei kein Menü. |
| `vorherKnopf(station)` | „vorher: Medientechnologie, …“ unter der festen Zeitleiste; öffnet ebenfalls ein Menü. |
| `zeigeAufbau(inhalt, mitAufbau)` | Startet das Ziehen der Achse und das Einblenden (bei reduzierter Bewegung sofort). |
| `zeichneJahreszeile()` | Gespräch: eine Zeile „2004 Navigon · …“, jede öffnet das Menü. |
| `zeichneListe(mitAufbau)` | Handy senkrecht: alle Stationen als Liste, Nebenspur eingerückt. |
| `einstiegsfragen(station)` | „Was hat Chris bei <Firma> gemacht?“ und je Stichpunkt „Erzähl mir mehr über „…“ bei <Firma>.“ |
| `oeffneStationsMenue(station, knopf)` | Füllt das Menü und legt es unter den Knopf (schwebt) oder in den Fluss (Handy, schiebt). Zweiter Klick schließt. |
| `schliesseStationsMenue()` | Schließt das Menü. Esc, Klick daneben, Scrollen der Zeitleiste und Neuzeichnen schließen es ebenfalls. |
| Lauscher „resize“ | Zeichnet nur bei anderer **Breite** neu (am Handy ändert die Adressleiste die Höhe). |

## oberflaeche.js

| Name | Was es tut |
|---|---|
| `profilName()` | „handy“ oder „desktop“. |
| `setzeAnsicht(name)` | Reiter, Bühne und Zeitleiste auf Werdegang oder Gespräch; Pfeiltasten wechseln den Reiter. |
| `absatz(text, klasse)` | Ein `<p>`. |
| `zeigeAntwort(frage, absaetze)` | Frage klein, darunter die Antwort; eine neue ersetzt die alte. |
| `zeigeWarten(frage)` | Neue Frage steht da, „Der Bot denkt nach …“, alte Antwort blass. |
| `setzeFolgefragen(fragen)` | Knöpfe über dem Fragefeld; Klick trägt nur ein. |
| `zeigeAntwortImBild()` | Scrollt zur Antwort, wenn sie nicht gut zu sehen ist. |
| `stelleFrage(frage)` | Wechselt ins Gespräch, fragt den vorgetäuschten Bot, zeigt die Antwort, lässt das Stichwort schreiben. Überholte Antworten werden verworfen. |
| Absenden (Lauscher) | Fängt das Absenden vor `seite.js` ab. |
| `wertVon(id)`, `leseSchalter()` | Liest das Bedienfeld in `SCHALTER` und `ZEITLEISTE`. |
| Schalter-Lauscher | Übernehmen Änderungen; Zeitleisten-Schalter zeichnen neu; „Dunkle Ecken“ stellt den Regler aus Prototyp 6. |
| `starteSeite()` | Schalter lesen, Werdegang, Begrüßung als erste Antwort (zweizeilig) bauen, Zeitleiste laden. |
