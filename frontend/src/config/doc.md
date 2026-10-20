# config

Die Abstimmungswerte der Seite an einer Stelle. Der Ordner importiert nichts; alle anderen dürfen ihn
lesen (Architekturtest).

| Name                 | Was es ist                                                                                                                 |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `ProfileName`        | `"desktop"` oder `"handy"`.                                                                                                |
| `DESKTOP_FROM_WIDTH` | Ab dieser Fensterbreite (700 px) gilt `desktop`.                                                                           |
| `Tuning`             | Alle Werte eines Profils (Tempo, Leuchtspur, Monitor, Farben, Labyrinth, Gerät, Haltepunkt, Pulsdauer, Brummen).           |
| `TUNING`             | Je Profil ein vollständiger Satz. Das Handy überschreibt einige Grundwerte (34 Spalten, dünnere Wände, kürzeres Schieben). |

Die Werte stammen aus `prototyp/06-frage-antwort/config.js`; `tests/golden-master/tuning.test.ts`
vergleicht sie. Prozentwerte stehen als Anteile von 0 bis 1. Neu sind `restingDistance` (2),
`pulseSeconds` (1,6) und die Werte des Brummens (`humVolume`, `humBaseHertz`, `humDriftHertz`,
`humMinLevel`, `humDriftSeconds`, siehe `sound/doc.md`). Die Einstellungs-Schnittstellen der Teile (`PlaybackSettings`, `RenderSettings`,
`MazeSettings`) sind Ausschnitte von `Tuning`, deshalb kann `main.ts` es unverändert übergeben.
