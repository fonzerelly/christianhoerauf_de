# Prototyp 7 „Brummen“

Probierseite, um das Brummen der Seite (Schritt 8 im Frontend-Plan) mit dem Ohr abzustimmen.
Eine einzelne HTML-Datei ohne Abhängigkeiten; öffnen mit `xdg-open prototyp/07-brummen/index.html`
und „Start“ klicken (Browser erlauben Ton erst nach einem Klick).

## Warum es ihn gibt

Die erste Fassung im Frontend bestand aus drei Sinustönen bei 50, 100 und 150 Hz mit der
Lautstärke 0,04. Gemessen kam das Signal an (im Mittel −38,5 dB), war am Laptop aber nicht zu
hören: Laptop-Lautsprecher geben unter etwa 150–300 Hz kaum etwas wieder, und über 150 Hz gab es
keine Energie. Eine Röhre brummt mit vielen Obertönen bis etwa 1–2 kHz; das Ohr ergänzt den
tiefen Grundton dann selbst.

## Erkenntnisse

- Eine **Sägezahnwelle** bei 50 Hz durch einen Tiefpass trifft den Klang (Christian, 2026-10-21).
- **Stille während der Bildstörung wirkt falsch.** Die Störung dauert auf der Seite 0,35–0,85 s,
  die Probe ebenso.
- **Gleichmäßiges Rauschen klingt wie eine Luftpumpe** (Christian, 2026-10-21). Gesucht ist eher
  „kaputte Elektronik“: abgebrochene Piepser. Deshalb die Störgeräusche Piepsen, Datensalat und
  Stottern.
- **Entschieden: Datensalat** (Christian, 2026-10-21). Werte der Voreinstellung „Röhre
  (Vorschlag)“: Sägezahn 50 Hz, Tiefpass 900 Hz, Lautstärke 0,06, kein Fiepen, Wandern ±0,4 Hz,
  Pegel ab 60 %, alle 3 s; bei Störung Datensalat mit Lautstärke 0,05, Tonhöhe bis 2.500 Hz,
  Stückchen um 40 ms. Übernahme ins Frontend: Schritt 8a im Frontend-Plan.

## Regler

| Regler | Wirkung |
|---|---|
| Wellenform | Sinus, Dreieck, Sägezahn, Rechteck, oder die drei Sinustöne der ersten Fassung |
| Grundton | 40–120 Hz (Netzbrummen: 50 Hz) |
| Tiefpass | dämpft die Obertöne über dieser Frequenz: links dumpf, rechts schnarrend |
| Lautstärke | Gesamtpegel des Brummens |
| Fiepen 15,6 kHz | das hohe Pfeifen alter Fernseher (Zeilenfrequenz); viele Erwachsene hören es nicht |
| Wandern | wie weit Tonhöhe und Pegel zufällig schwanken und wie oft ein neues Ziel gewürfelt wird |
| Bei Störung | Piepsen, Datensalat, Stottern, Stille, Rauschen statt Brummen, Rauschen über dem Brummen |
| Störung Lautstärke | Pegel des Störgeräuschs (Piepsen, Datensalat, Rauschen) |
| Rauschen Färbung | Mittenfrequenz (Bandpass) des Rauschens |
| Störung Tonhöhe bis | höchste Tonhöhe der Piepser bzw. des Datensalats |
| Störung Stückchen | ungefähre Länge der Stückchen, in die die Störung zerhackt wird |

Voreinstellungen: „Wie bisher“ (erste Fassung), „Röhre (Vorschlag)“, „Röhre mit Fiepen“. Unten
auf der Seite stehen die aktuellen Werte als JSON zum Übernehmen.

## Nadeldrucker

Seit 2026-10-28: das Geräusch eines 9-Nadel-Druckers (etwa Epson FX), unabhängig vom Brummen –
die Knöpfe gehen auch ohne „Start“. „Eine Zeile drucken“ druckt eine Zeile, „3 Zeilen drucken und
abreißen“ drei Zeilen, schiebt das Papier zur Abreißkante vor und reißt es nach kurzer Pause ab.

Das Geräusch wird vorab als drei Spuren berechnet, die gleichzeitig laufen:

- **Nadeln**: helles Rauschen, das im „Anschlagtakt“ (225-mal pro Sekunde, ±3 % Schwankung)
  pulsiert: Jeder Puls ist ein Rauschstoß, der in 1,5 ms abklingt; darunter liegt über jedem
  Zeichen ein leiseres gleichmäßiges Rauschen, damit es zwischen den Pulsen nie still wird. Wie
  kräftig ein Puls ist (0,4–1), hängt vom Zeichen ab; über Leerzeichen bleibt es still. Ein breiter
  Bandpass („Klang des Druckkopfs“, Güte 0,8, Mitte 4,5 kHz) und ein Tiefpass bei 8 kHz färben es.
- **Motor**: Beim Drucken rauscht der Kopfmotor (kein Ton – eine Rechteckwelle klang wie ein
  altes E-Piano); am Zeilenende klackt der Kopf und kehrt um (jede zweite Zeile wird rückwärts
  gedruckt); dann schiebt der Papiermotor in 18 Schritten eine Zeile weiter (das kurze „Brrrt“).
  Durch einen Tiefpass bei 3.500 Hz.
- **Papier**: Abreißen an der Perforation – knisternde Rauschstöße, die immer schneller kommen,
  dazu leises Rascheln und am Ende ein letzter Ruck. Durch einen Hochpass bei 500 Hz.

| Regler | Wirkung |
|---|---|
| Drucker Lautstärke | Gesamtpegel des Druckers |
| Zeichen pro Sekunde | Druckgeschwindigkeit (40–300); bestimmt, wie lange eine Zeile dauert |
| Anschlagtakt | wie oft pro Sekunde das Rauschen der Nadeln pulsiert (80–600 Hz, Aufnahme: 225 Hz) |
| Klang des Druckkopfs | Mittenfrequenz des Bandpasses für die Nadeln: links dumpf, rechts spitz |
| Motor-Anteil | wie laut Kopf- und Papiermotor gegenüber den Nadeln sind |

Die Druckerwerte stehen mit im JSON unten auf der Seite.

### Abgleich mit einer echten Aufnahme (2026-10-28)

Vorlage: `9-nadeldrucker-sound.mp3` (23 s), auf der Seite als Player „Echte Aufnahme“ zum
direkten Vergleich. Gemessen mit einem kleinen numpy-Skript (Pegel je 100 ms, Spektrum der lauten
und leisen Stellen):

| | Aufnahme | Synthese vorher | Synthese jetzt |
|---|---|---|---|
| Schwerpunkt beim Drucken | 5,0 kHz | 2,5-kHz-Bandpass, schmal | 5,7 kHz |
| Energie 2–4 / 4–8 / 8–16 kHz | 20 / 47 / 16 % | – | 26 / 45 / 19 % |
| Anschlagtakt | ≈ 1.350 Hz (Spitzen bei 1.360, 2.690, 4.050 Hz) | 1.440 Hz | 1.440 Hz |
| Kopfmotor | ≈ 440 Hz | 360 Hz | 360 Hz |
| Zeile / Pause | 0,3–0,5 s / 0,2–0,3 s, Pause ≈ 18 dB leiser | 0,03–0,26 s / 0,2 s | ≈ 0,45 s / 0,2 s |

Daraus: Bandpass von 2,5 kHz (Güte 1,8) auf 4 kHz (Güte 0,8), Tiefpass des Motors von 1.800
auf 3.500 Hz und leiserer Ton beim Papiervorschub (die Pausen der Aufnahme sind mittig-hell,
nicht dumpf), drei etwa gleich lange Zeilen statt einer langen und zwei sehr kurzen. Offen: In
der Aufnahme steckt mehr Energie bei 1–2 kHz (13 % gegen 4 %), der Grundtakt der Anschläge ist
dort deutlicher zu hören.

**Zweiter Abgleich.** Christian: „klingt überhaupt nicht so wie das Original“ – im Original ist
die Frequenz höher, und der Motor klang wie ein altes E-Piano. Eine genauere Messung
(Modulationsspektrum: wie oft pro Sekunde die Lautstärke des hellen Anteils pulsiert) zeigte,
dass das Modell falsch war: Das Original ist **kein Klicken einzelner Nadeln mit 1.400 Hz**,
sondern dichtes Rauschen (4–8 kHz), das **225-mal pro Sekunde pulsiert** (dazu 450 und 675 Hz);
einzelne Anschläge sind in der Hüllkurve nicht zu trennen. Einen tonalen Motor gibt es nicht.
Die Spitzen bei 1.360/2.690/4.050 Hz aus dem ersten Abgleich waren Resonanzen, nicht der Takt.

Umgebaut: Nadeln als pulsierendes Rauschen (Regler „Anschlagtakt“), Motor als Rauschen,
Bandpass 4,5 kHz plus Tiefpass 8 kHz (ohne ihn lag ein Fünftel der Energie über 16 kHz, wo die
MP3-Aufnahme nichts mehr hat), Motor-Anteil 0,4.

| | Aufnahme | Synthese |
|---|---|---|
| Schwerpunkt beim Drucken | 5,0 kHz | 5,3 kHz |
| Energie 1–2 / 2–4 / 4–8 / 8–16 kHz | 13 / 20 / 47 / 16 % | 3 / 24 / 61 / 11 % |
| Pulsieren | 225 / 450 / 675 Hz | 225 / 450 / 675 Hz |
| Pegel Drucken / Pause | ≈ −22 / −40 dB | ≈ −25 / −43 dB |

## Funktionen in `index.html`

| Funktion | Was sie konkret tut |
|---|---|
| `settings()` | Liest alle Regler und Auswahlfelder und liefert ihre Werte als Objekt. |
| `applyPreset(name)` | Setzt alle Regler auf eine Voreinstellung, baut die Tonquellen neu und übernimmt die Werte. |
| `buildAudio()` | Baut beim ersten Start die Tonanlage: Hauptregler, Messpunkt, Tiefpass fürs Brummen, Fiepen (15.625 Hz) und ein Rauschen (2 s weißes Rauschen in Schleife durch einen Bandpass). |
| `rebuildVoices()` | Ersetzt die Tonquellen des Brummens: eine Welle der gewählten Form, oder drei Sinustöne wie in der ersten Fassung. |
| `applyGain(timeConstant)` | Lässt Brummen und Fiepen weich zu ihrem Sollpegel gleiten; während einer Störung still, außer bei „Rauschen über dem Brummen“. |
| `drift()` | Würfelt ein neues Ziel für Tonhöhe und Pegel, gleitet dorthin und plant den nächsten Wurf. |
| `refresh()` | Zeigt die Werte neben den Reglern und im JSON-Block und überträgt Tiefpass, Rauschfarbe und Pegel. |
| `updateMeter()` | Misst bei jedem Bild den Pegel am Ausgang (RMS in dB) und zeigt ihn an. |
| `between(low, high)` | Eine Zufallszahl zwischen den beiden Grenzen. |
| `glitchBuffer(kind, seconds, pitchMax, chopMillis)` | Berechnet das Störgeräusch als Klangstückchen: zerhackt in Stückchen, 30 % davon still. Piepsen: Rechteckwelle mit springender Tonhöhe. Datensalat: Zufallswerte, je Stückchen unterschiedlich lange gehalten (kratzig, digital). |
| `stutter(seconds, chopMillis)` | Lässt das Brummen in schnellem Wechsel aus- und angehen und dabei in der Tonhöhe springen (0,7- bis 1,8-fach), danach zurück. |
| `glitch()` | Spielt eine Bildstörung von 0,35–0,85 s: Brummen weg (außer bei Stottern und „Rauschen über dem Brummen“), dazu das gewählte Störgeräusch, danach zurück. |
| `ensureAudio()` | Baut die Tonanlage beim ersten Klick (Start oder Drucker) und weckt sie auf. |
| `printerSettings()` | Liest die fünf Druckerregler und liefert ihre Werte als Objekt. |
| `pulseStrength(char, pulse)` | Wie kräftig ein Puls über diesem Zeichen ist (0,4–1): eine Pseudozufallszahl aus Zeichen und Pulsnummer, damit derselbe Buchstabe immer gleich klingt; Leerzeichen liefern 0. |
| `printPlan(lines, withTear)` | Plant den Druckauftrag als Abschnitte mit Startzeit und Dauer: je Zeile drucken (jede zweite rückwärts), umkehren, Papier vorschieben; mit `withTear` danach Vorschub zur Abreißkante, Pause, Abreißen. Liefert die Abschnitte und die Gesamtdauer. |
| `addClick(data, sampleRate, time, loudness, decay)` | Schreibt einen kurzen Anschlag in eine Spur: Rauschen, das exponentiell abklingt. |
| `addNoise(data, sampleRate, start, seconds, loudness)` | Schreibt gleichmäßiges Rauschen in eine Spur (Motor, Grundrauschen der Nadeln), je 10 ms ein- und ausgeblendet. |
| `addTear(data, sampleRate, start, seconds)` | Schreibt das Abreißen in eine Spur: Rauschstöße, deren Takt von etwa 200 auf 850 pro Sekunde steigt, Rascheln darunter, am Ende ein kräftiger Ruck. |
| `PRINT_PARTS` | Je Abschnittsart (`line`, `turn`, `feed`, `tear`), wie er klingt: pulsierendes Rauschen der Nadeln (Pulse im Anschlagtakt, Grundrauschen je Zeichen) und Rauschen des Kopfmotors, Klacken beim Umkehren, Schritte des Papiervorschubs, Abreißen. |
| `printerSound(lines, withTear, sampleRate)` | Berechnet einen Druckauftrag als drei gleich lange Spuren (Nadeln, Motor, Papier). |
| `printJob(lines, withTear)` | Spielt einen Druckauftrag: jede Spur durch ihre Filter (Nadeln: Bandpass und Tiefpass 8 kHz; Motor: Tiefpass; Papier: Hochpass) und alle drei zur selben Zeit. |
