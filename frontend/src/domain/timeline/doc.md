# domain/timeline

Der Maßstab der Zeitleiste als reine Rechnung (Plan Schritt 12.9, Q45, Q47). Vorlage:
`prototyp/12-klappleiste/zeitleiste.js`. Die Breiten der Beschriftungen misst die Seite und gibt
sie herein.

## scale.ts

| Name                                                  | Was sie konkret tut                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sectionsOf(mainTrack, minWidths, today)`             | Jede Station der Linie als Abschnitt bis zum Beginn der nächsten, die letzte bis `today`; dazu ihre Mindestbreite (gleich viele wie Stationen).                                                                                                                                                                                                                                                                                                             |
| `pixelsPerYear(sections, width)`                      | Pixel je Jahr, so dass die Abschnitte `width` füllen. Abschnitte, die so schmaler als ihre Mindestbreite würden, bekommen diese, und der Rest verteilt sich neu (bis zu sechsmal nachgerechnet). Passen nicht einmal die Mindestbreiten, bleibt der letzte Wert.                                                                                                                                                                                            |
| `layOut(sections, perYear)`                           | Legt die Abschnitte nebeneinander: `x` und `width` (Dauer × Pixel je Jahr, mindestens die Mindestbreite).                                                                                                                                                                                                                                                                                                                                                   |
| `xForYear(year, laid)`                                | Ein Zeitpunkt anteilig in seinem Abschnitt; vor dem ersten am Anfang, nach dem letzten am Ende, ohne Abschnitte 0.                                                                                                                                                                                                                                                                                                                                          |
| `layOutExpanded(stations, minWidths, options, today)` | Die ganze aufgeklappte Zeitleiste: Der Beruf füllt `availableWidth − todaySpace`, nie weniger als `minPixelsPerYear` je Jahr; die Stationen davor kommen im selben Maßstab dazu. Liefert die gelegten Abschnitte, das Ende der Linie, die Breite des Inhalts (mit Platz für „heute“) und je Engagement den Beginn und die größte Breite seiner Beschriftung (bis vor das nächste bzw. bis zum Ende, abzüglich `labelAir`, mindestens `minEngagementWidth`). |

## scrollbar.ts

Die eigene Bildlaufleiste als Rechnung (die des Browsers ist ausgeblendet, weil sie sich nicht
bündig zwischen „‹“ und den Klappknopf legen lässt).

| Name                                      | Was sie konkret tut                                                                                                            |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `thumbOf(view)`                           | Breite des Griffs: Bahn × sichtbarer Anteil, mindestens 24 px; Lage: anteilig zur Verschiebung (ohne Verschiebung ganz links). |
| `scrollLeftForThumbDrag(start, dx, view)` | Ziehen am Griff um `dx`: Verschiebung + `dx` × (Inhaltsweg ÷ Griffweg).                                                        |
| `scrollLeftForTrackClick(x, view)`        | Druck in die Bahn bei `x`: Der Griff springt mit seiner Mitte dorthin; begrenzt auf 0 bis zum ganzen Inhaltsweg.               |
| `overflows(scrollWidth, clientWidth)`     | Ist der Inhalt um mehr als 1 px breiter als der sichtbare Bereich?                                                             |
