# src

Der Code der Seite.

| Datei           | Was sie tut                                                                                                                                                                                              |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `main.ts`       | Composition Root: steckt alle Teile zusammen, ohne eigene Logik.                                                                                                                                         |
| `domain/`       | Schrift, Textumbruch, Labyrinth, Route (siehe `domain/doc.md`).                                                                                                                                          |
| `animation/`    | Ablauf der Antworten über die Zeit (siehe `animation/doc.md`).                                                                                                                                           |
| `rendering/`    | Zeichnen auf ein Canvas (siehe `rendering/doc.md`).                                                                                                                                                      |
| `answering/`    | Woher die Antworten kommen (siehe `answering/doc.md`).                                                                                                                                                   |
| `sound/`        | Das Brummen der Bildröhre mit Web Audio (siehe `sound/doc.md`).                                                                                                                                          |
| `ui/`           | Fragefeld, Bühne, Takt, Fenstergröße (siehe `ui/doc.md`).                                                                                                                                                |
| `config/`       | Abstimmungswerte je Geräteprofil (siehe `config/doc.md`).                                                                                                                                                |
| `test-support/` | Hilfen nur für Tests, zählt nicht zur Abdeckung: `scriptedRandom`, `ManualClock`, `ManualTaskQueue`, `FakePageSource`, `recordingContext`, `FakeLayers`, `fakeAudioContext`, `mazePage`, `playbackView`. |
| `style.css`     | Aussehen der Startseite: Raster aus Bühne, Fragefeld und Hinweis, Farben, Fragefeld, Hinweis.                                                                                                            |
| `legal.css`     | Aussehen von `impressum.html` und `datenschutz.html`: gleiche Farben und Schrift, aber zum Lesen und Scrollen.                                                                                           |
| `vite-env.d.ts` | Typen für `import.meta.env`, darunter `VITE_ANSWER_URL` (Adresse des Backends).                                                                                                                          |
