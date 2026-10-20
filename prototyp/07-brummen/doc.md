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
- **Stille während der Bildstörung wirkt falsch.** Stattdessen ein kurzes Rauschen; die Störung
  dauert auf der Seite 0,35–0,85 s, die Probe ebenso.

## Regler

| Regler | Wirkung |
|---|---|
| Wellenform | Sinus, Dreieck, Sägezahn, Rechteck, oder die drei Sinustöne der ersten Fassung |
| Grundton | 40–120 Hz (Netzbrummen: 50 Hz) |
| Tiefpass | dämpft die Obertöne über dieser Frequenz: links dumpf, rechts schnarrend |
| Lautstärke | Gesamtpegel des Brummens |
| Fiepen 15,6 kHz | das hohe Pfeifen alter Fernseher (Zeilenfrequenz); viele Erwachsene hören es nicht |
| Wandern | wie weit Tonhöhe und Pegel zufällig schwanken und wie oft ein neues Ziel gewürfelt wird |
| Bei Störung | Stille, Rauschen statt Brummen, oder Rauschen über dem Brummen |
| Rauschen Lautstärke, Färbung | Pegel und Mittenfrequenz (Bandpass) des Rauschens |

Voreinstellungen: „Wie bisher“ (erste Fassung), „Röhre (Vorschlag)“, „Röhre mit Fiepen“. Unten
auf der Seite stehen die aktuellen Werte als JSON zum Übernehmen.

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
| `glitch()` | Spielt eine Bildstörung von 0,35–0,85 s: Brummen weg, je nach Auswahl Rauschen an, danach zurück. |
