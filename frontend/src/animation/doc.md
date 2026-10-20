# animation

Der Ablauf der Antworten über die Zeit. Dieser Ordner kennt weder Browser noch Canvas: Die Zeit
kommt über den Port `Clock`, die Seiten über den Port `PageSource` (erfüllt vom `AnswerPaginator`
der Domäne). Gezeichnet wird in `rendering/`; es liest die Zustände von `AnswerPlayback`.

| Datei                  | Was sie tut                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------ |
| `clock.ts`             | Port `Clock`: die Zeit in Sekunden.                                                  |
| `performance-clock.ts` | `PerformanceClock`: die Uhr des Browsers, aus Millisekunden.                         |
| `frame-timer.ts`       | `FrameTimer`: Zeit von einem Bild zum nächsten, mit längstem Schritt.                |
| `playback-settings.ts` | `PlaybackSettings`: Tempo, Schnelldurchlauf, Weiterschieben, Leuchtdauer, Startwert. |
| `pace.ts`              | `paceOf`: Zellen pro Sekunde je Art von Wegstück.                                    |
| `trail.ts`             | `Trail`: Helligkeit der Leuchtspur je Wegstück.                                      |
| `route-walker.ts`      | `RouteWalker`: lässt den Lichtpunkt eine Route ablaufen.                             |
| `pulse.ts`             | `pulseOf`: Helligkeit des pulsierenden Lichtpunkts am Haltepunkt.                    |
| `page-source.ts`       | Port `PageSource`: erzeugt die Seiten einer Antwort.                                 |
| `answer-playback.ts`   | `AnswerPlayback`: der Zustandsautomat über alle Abschnitte.                          |

## Ablauf einer Antwort

```
schreiben ──► (Seitenende) ──► hinauslaufen ──► verglimmen ──► weiterschieben ──► schreiben …
    │
    └──► (Ende der Antwort) ──► zum Haltepunkt ──► warten (pulsiert) ──► neue Antwort da ──►
         hinauslaufen ──► verglimmen ──► weiterschieben ──► schreiben
```

Die Abschnitte (`Phase`): `writing` (Lichtpunkt läuft, schreibend und hinaus), `resting` (steht am
Haltepunkt und pulsiert), `fading` (draußen, Spur verglimmt), `scrolling` (Bild schiebt weiter),
`waiting` (nichts bewegt sich, die nächste Antwort fehlt).

## Clock, PerformanceClock

| Name                                 | Was sie konkret tut                                                   |
| ------------------------------------ | --------------------------------------------------------------------- |
| `Clock.now()`                        | Port: liefert die Zeit in Sekunden seit einem festen Nullpunkt.       |
| `PerformanceClock.constructor(read)` | Nimmt eine Quelle für Millisekunden (im Browser `performance.now()`). |
| `PerformanceClock.now()`             | Liefert die Millisekunden der Quelle geteilt durch 1000.              |

## FrameTimer

| Methode                                  | Was sie konkret tut                                                                                                                           |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `constructor(clock, longestStepSeconds)` | Merkt sich Uhr und den längsten erlaubten Schritt.                                                                                            |
| `secondsSinceLastFrame()`                | Liefert die Zeit seit dem vorigen Aufruf, höchstens den längsten Schritt (Schutz vor einem Riesensprung nach einer Pause); beim ersten Mal 0. |
| `restart()`                              | Vergisst den vorigen Aufruf: der nächste liefert wieder 0 (Tab kommt aus dem Hintergrund zurück).                                             |

## paceOf

`paceOf(kind, isRushing, settings)`: Schriftweg mit `speed`, Verbindungsweg und Sprung mit
`speed * connectorSpeedFactor`. Im Schnelldurchlauf zusätzlich mal `rushFactor`.

## Trail

Die Leuchtspur merkt sich, wann jedes Wegstück fertig gelaufen wurde. Es leuchtet `holdSeconds`
lang voll und blendet dann in `fadeSeconds` aus. Die Helligkeit gibt es in 16 Stufen
(`BRIGHTNESS_LEVELS`), damit der Renderer Wegstücke gleicher Stufe in einem Rutsch zeichnen kann.

| Methode                                            | Was sie konkret tut                                                                                                                                 |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `constructor(settings)`                            | Merkt sich Leucht- und Ausblenddauer.                                                                                                               |
| `reset()`                                          | Vergisst alle gelaufenen Wegstücke (neue Seite).                                                                                                    |
| `markWalked(stepsDoneBefore, stepsDoneNow, clock)` | Merkt für die seither fertig gelaufenen Wegstücke die Uhrzeit.                                                                                      |
| `levelOf(step, clock)`                             | Stufe 0 bis 16: 16, solange das Wegstück noch gelaufen wird oder voll leuchtet; danach linear ausblendend, aufgerundet; 0, wenn verglommen.         |
| `firstGlowingStep(stepsDone, clock)`               | Das erste Wegstück, das noch leuchtet. Davor ist alles verglommen und muss nicht gezeichnet werden. Ist alles verglommen: Schritt nach dem letzten. |

## RouteWalker

| Methode / Eigenschaft               | Was sie konkret tut                                                                                                                                                                                |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `constructor(route)`                | Stellt den Lichtpunkt auf das erste Wegstück.                                                                                                                                                      |
| `progress`                          | Gelaufene Wegstücke mit Nachkommastellen (2,5: zwei fertig, das dritte halb).                                                                                                                      |
| `stepsDone`                         | Ganz gelaufene Wegstücke, höchstens das letzte der Route.                                                                                                                                          |
| `hasReached(step)`                  | Ist das Wegstück erreicht?                                                                                                                                                                         |
| `walk(seconds, targetStep, paceOf)` | Läuft `seconds` lang, höchstens bis `targetStep` (und bis zum Ende der Route). Rechnet Wegstück für Wegstück ab, weil jede Art ein anderes Tempo hat. Liefert, welche Wegstücke neu fertig wurden. |
| `position()`                        | Wo der Lichtpunkt steht, auch zwischen zwei Zellen (gemischt aus beiden).                                                                                                                          |

## pulseOf

`pulseOf(secondsResting, periodSeconds)`: Kosinuskurve von 1 (hell, am Anfang) über 0 (dunkel, nach
der halben Dauer) zurück zu 1. Bei weniger Bewegung (`prefers-reduced-motion`) zeigt der Renderer
stattdessen ein ruhiges Leuchten.

## AnswerPlayback

Der Zustandsautomat. Er zeichnet nichts und kennt weder Fragefeld noch Antwortquelle: Wer eine
Frage stellt, übergibt ein Versprechen für den Text der Antwort.

| Methode / Eigenschaft                       | Was sie konkret tut                                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `constructor(pageSource, settings)`         | Beginnt im Abschnitt `waiting`, ohne Seite.                                                                                                                                                                                                                                                                                                 |
| `request(reply)`                            | Eine Frage wurde gestellt. Seiten, die noch nicht zu sehen sind, entfallen. Läuft der Lichtpunkt oder schiebt das Bild gerade, laufen die sichtbaren Seiten im Schnelldurchlauf. Kommt der Text, werden seine Seiten angehängt (Startwert = `seed` + Zahl der bisher geschriebenen Antworten); nur die Antwort auf die neueste Frage zählt. |
| `advance(seconds)`                          | Lässt die Zeit vergehen. `writing`: Lichtpunkt zum Haltepunkt (letzte Seite, noch nicht erreicht) oder zum Ausgang. `fading`: nach Leucht- plus Ausblenddauer, im Schnelldurchlauf sofort, weiter zu `scrolling` oder `waiting`. `scrolling`: nach `scrollSeconds` startet die nächste Seite.                                               |
| `acceptAnswer` (privat)                     | Erzeugt die Seiten, hängt sie an. Aus `resting` läuft der Lichtpunkt hinaus; aus `waiting` beginnt das Weiterschieben, oder (bei der Begrüßung) sofort das Schreiben.                                                                                                                                                                       |
| `startPage` (privat)                        | Wirft Seiten davor weg, stellt den Lichtpunkt an den Anfang der Seite, vergisst die Spur.                                                                                                                                                                                                                                                   |
| `targetStep` (privat)                       | Haltepunkt, wenn die Seite die letzte ist und er noch nicht erreicht wurde, sonst das Ende der Route. Liegt schon eine Seite dahinter (die Antwort ist da), läuft der Lichtpunkt ohne Pause durch.                                                                                                                                          |
| `phase`, `currentPage`, `nextPage`          | Abschnitt, aktuelle Seite (`undefined` vor der ersten Antwort) und die Seite danach (beim Weiterschieben schon zu sehen).                                                                                                                                                                                                                   |
| `progress`, `dotPosition()`, `isDotVisible` | Fortschritt auf der Route, Stelle des Lichtpunkts (`undefined` ohne Seite), ob er zu sehen ist (`writing` und `resting`).                                                                                                                                                                                                                   |
| `isRushing`                                 | Läuft die aktuelle Seite im Schnelldurchlauf?                                                                                                                                                                                                                                                                                               |
| `scrollPart`                                | Fortschritt des Weiterschiebens von 0 bis 1, sanft angefahren und abgebremst; sonst 0.                                                                                                                                                                                                                                                      |
| `restingSeconds`                            | Wie lange der Lichtpunkt am Haltepunkt wartet (für `pulseOf`); sonst 0.                                                                                                                                                                                                                                                                     |
| `trailLevelOf(step)`, `firstGlowingStep()`  | Helligkeitsstufe der Leuchtspur und erstes noch leuchtendes Wegstück.                                                                                                                                                                                                                                                                       |
