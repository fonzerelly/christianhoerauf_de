# sound

Das Brummen einer alten Bildröhre. Der Ordner kennt nur `domain/` (für `RandomSource`) und
`config/`; Animation, Zeichnen und Oberfläche kennen ihn nicht, nur `ui/` und `main.ts` steuern ihn
(Architekturtest). Der Ton-Ausgang des Browsers steckt hinter dem schmalen `AudioContextLike`; im
Test steht eine Attrappe dafür, die jeden Aufruf aufzeichnet (`test-support/fake-audio-context.ts`).

| Datei              | Was sie tut                                                                                   |
| ------------------ | --------------------------------------------------------------------------------------------- |
| `hum-sound.ts`     | Port `HumSound` (`start`, `stop`, `tune`, `mute`) und `HumTuning` (Frequenz, Lautstärke).     |
| `web-audio-hum.ts` | `WebAudioHum`: der Adapter, der das Brummen mit Web Audio erzeugt.                            |
| `hum-drift.ts`     | `HumDrift`: würfelt das langsame Wandern von Frequenz und Lautstärke.                         |
| `hum-control.ts`   | `HumControl`: schaltet an und aus und lässt es bei Bildstörung und im Hintergrund verstummen. |
| `hum-settings.ts`  | `HumSettings`: die Abstimmungswerte des Brummens (Ausschnitt von `Tuning`).                   |
| `audio-context.ts` | `AudioContextLike` und `AudioContextFactory`: schmaler Ausschnitt von `AudioContext`.         |

## Klang

Drei Sinustöne: der Grundton bei 50 Hz (Netzfrequenz) und zwei Obertöne bei 100 und 150 Hz mit
den Stärken 1, 0,7 und 0,5. Laptop-Lautsprecher geben 50 Hz kaum wieder; hörbar sind vor allem die
Obertöne. Jeder Ton geht durch einen Regler für seine Stärke in einen gemeinsamen Regler, der den
Pegel bestimmt (`humVolume` mal Lautstärke-Anteil, 0 wenn aus oder verstummt).

Abstimmungswerte (`config/tuning.ts`): `humVolume` 0,04 (höchster Pegel), `humBaseHertz` 50,
`humDriftHertz` 0,4 (so weit weicht die Frequenz höchstens ab), `humMinLevel` 0,5 (so leise wird es
beim Wandern höchstens, Anteil von `humVolume`), `humDriftSeconds` 3 (alle drei Sekunden ein neues Ziel).

## WebAudioHum

| Methode               | Was sie konkret tut                                                                                                                                                                                                                 |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `start()`             | Beim ersten Mal: legt den `AudioContext` an (erst jetzt, nach dem Klick) und baut die Anlage; der gemeinsame Regler steht auf 0. Dann `resume()` und weiches Einblenden (Zeitkonstante 0,1 s).                                      |
| `stop()`              | Blendet weich aus (0,1 s). Die Töne laufen leise weiter, das Wiedereinschalten ist so klickfrei.                                                                                                                                    |
| `tune(tuning)`        | Lässt die Frequenz der drei Töne (Grundton mal 1, 2, 3) mit Zeitkonstante 1 s zur neuen gleiten und die Lautstärke zum neuen Anteil von `humVolume`. Ist es gerade aus oder verstummt, bleibt der Pegel 0, der Anteil wird gemerkt. |
| `mute(isMuted)`       | Blendet für die Dauer des Verstummens aus (0,1 s) und danach wieder auf den gemerkten Pegel ein.                                                                                                                                    |
| `buildGraph` (privat) | Legt Regler und Töne an und verbindet sie (Ton → Stärke-Regler → gemeinsamer Regler → Ausgang).                                                                                                                                     |
| `applyGain` (privat)  | Setzt den Zielwert des gemeinsamen Reglers mit `setTargetAtTime`; alle Übergänge sind weich, damit nichts klickt.                                                                                                                   |

`stop`, `tune` und `mute` vor dem ersten `start` werfen einen Fehler (die Steuerung ruft sie nie so auf).

## HumDrift

| Methode / Eigenschaft | Was sie konkret tut                                                                                                                                                                                                                        |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `current`             | Das aktuelle Ziel. Am Anfang: Grundton, Lautstärke in der Mitte zwischen `humMinLevel` und 1.                                                                                                                                              |
| `advance(seconds)`    | Zählt die Zeit seit dem letzten Ziel hoch. Ist `humDriftSeconds` erreicht, würfelt es ein neues: Frequenz = Grundton + (Zufall − 0,5) · 2 · `humDriftHertz`, Lautstärke = `humMinLevel` + Zufall · (1 − `humMinLevel`). Sonst `undefined`. |

## HumControl

| Methode                          | Was sie konkret tut                                                                                                                                                                       |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `isOn`                           | Ist das Brummen an? Beim Laden nicht, und es wird nirgends gespeichert.                                                                                                                   |
| `toggle()`                       | Schaltet um und gibt den neuen Zustand zurück. Beim Einschalten: `start`, die aktuellen Wanderwerte, dann der Stand des Verstummens (Bildstörung, Hintergrund). Beim Ausschalten: `stop`. |
| `update(seconds, isGlitching)`   | Von der Bühne in jedem Bild gerufen. Ist es an: lässt das Brummen wandern (neues Ziel an `tune`) und verstummen, solange eine Bildstörung läuft. Der Ton hört nur Änderungen.             |
| `pageVisibilityChanged(visible)` | Im Hintergrund-Tab verstummt das Brummen, beim Zurückkehren kommt es wieder, außer eine Bildstörung läuft noch.                                                                           |
| `reportMuted` (privat)           | Sagt dem Ton `mute(Bildstörung oder Hintergrund)`, aber nur wenn sich der Wert seit der letzten Meldung geändert hat.                                                                     |

## test-support für dieses Verzeichnis

`fake-audio-context.ts` (`fakeAudioContext()`: zeichnet jeden Aufruf des Ton-Ausgangs als Text auf, mit
nummerierten Knoten und einer Uhr von Hand).
