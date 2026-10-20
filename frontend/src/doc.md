# src

Der Code der Seite.

| Datei           | Was sie tut                                                                                                                                                                           |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `main.ts`       | Composition Root: steckt alle Teile zusammen, ohne eigene Logik.                                                                                                                      |
| `domain/`       | Schrift, Textumbruch, Labyrinth, Route (siehe `domain/doc.md`).                                                                                                                       |
| `animation/`    | Ablauf der Antworten über die Zeit (siehe `animation/doc.md`).                                                                                                                        |
| `rendering/`    | Zeichnen auf ein Canvas (siehe `rendering/doc.md`).                                                                                                                                   |
| `answering/`    | Woher die Antworten kommen (siehe `answering/doc.md`).                                                                                                                                |
| `sound/`        | Das Brummen der Bildröhre mit Web Audio (siehe `sound/doc.md`).                                                                                                                       |
| `ui/`           | Fragefeld, Bühne, Takt, Fenstergröße (siehe `ui/doc.md`).                                                                                                                             |
| `config/`       | Abstimmungswerte je Geräteprofil (siehe `config/doc.md`).                                                                                                                             |
| `test-support/` | Hilfen nur für Tests, zählt nicht zur Abdeckung: `scriptedRandom`, `ManualClock`, `FakePageSource`, `recordingContext`, `FakeLayers`, `fakeAudioContext`, `mazePage`, `playbackView`. |
| `style.css`     | Aussehen der Seite: Raster aus Bühne und Fragefeld, Farben, Fragefeld.                                                                                                                |
