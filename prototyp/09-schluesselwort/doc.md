# Prototyp 9: Schlüsselwort statt ganzer Antwort

Entstanden aus der Diskussion vom 2026-10-31 (siehe
`../08-chatbot-galerie/brainstorm-2026-10-31.md`). Ausgangslage: Das Labyrinth bleibt das
Markenzeichen (Visitenkarte, Briefkopf), aber niemand soll warten müssen, bis der Lichtpunkt
eine ganze Antwort geschrieben hat.

**Die Idee:** Die Antwort steht sofort als normaler Text da. Der Lichtpunkt schreibt nur noch
ein Schlüsselwort, als Akzent. Im Text ist dasselbe Wort rot markiert, damit Labyrinth und
Antwort sichtbar zusammengehören.

Zwei Varianten zum Vergleichen:

| Variante | Ordner | Einzeldatei |
|---|---|---|
| **A: Overlay** – Labyrinth wie heute über die ganze Fläche, Schlüsselwort im oberen Viertel, Antwort halbtransparent in der unteren Hälfte | `overlay/` | `/mnt/share/website/schluesselwort-overlay/index.html` |
| **B: Briefpapier** – weiße Seite wie Anschreiben und Lebenslauf, oben der Briefkopf-Streifen, in dem der Lichtpunkt das Schlüsselwort schreibt; Antworten als Aufzählung wie eine Station im Lebenslauf, neueste oben | `briefpapier/` | `/mnt/share/website/schluesselwort-briefpapier/index.html` |

Antworten sind Lorem ipsum für drei Fragen (Vorschlagsknöpfe), jeweils mit einem echten
Schlüsselwort darin: „Wer bist du?“ → ENTWICKLER, „Was machst du beruflich?“ → KAFKA,
„Erzähl mir was Langes“ → TYPESCRIPT. Die Begrüßung schreibt CHRIS, Unbekanntes HM?.
Der Bot antwortet nach 0,5–1,2 s, wie später ein echtes Sprachmodell.

Wie das Schlüsselwort ausgewählt wird, ist noch offen.

## Bauen und ansehen

```bash
./baue-einzeldateien.sh        # schreibt beide Einzeldateien nach /mnt/share/website
```

Die Quellen lassen sich auch direkt öffnen (`overlay/index.html`, `briefpapier/index.html`);
sie laden die Skripte von Prototyp 6 über relative Pfade.

Tests gibt es keine, es sind Prototypen.

## Dateien

| Datei | Inhalt |
|---|---|
| `antworten-schluesselwort.js` | Platzhalter-Antworten mit Schlüsselwort, Suche, Markierung, Satzzerlegung, vorgetäuschter Bot. Von beiden Varianten benutzt. |
| `overlay/index.html` | Kopie von `06-frage-antwort/index.html`, ergänzt um das Overlay (Markup und CSS am Ende des Style-Blocks). Lädt die Skripte von Prototyp 6. |
| `overlay/overlay.js` | Was Variante A anders macht als Prototyp 6. Wird vor `seite.js` geladen. |
| `briefpapier/index.html` | Variante B: Seite, Aussehen und Ablauf. |
| `briefpapier/briefkopf.js` | Der lebendige Briefkopf-Streifen. |
| `baue-einzeldateien.sh` | Setzt jede Variante zu einer einzigen HTML-Datei zusammen. |

## antworten-schluesselwort.js

| Name | Was es tut |
|---|---|
| `SCHLUESSEL_ANTWORTEN` | Begrüßung, Ausweich-Antwort und drei Einträge, je mit `schluesselwort` (nur Zeichen der Labyrinth-Schrift, `\|` als Trennstelle) und `text`. Einträge haben zusätzlich `stichwoerter`. |
| `SCHLUESSEL_VORSCHLAEGE` | Die drei Fragen für die Vorschlagsknöpfe. |
| `vereinfacheFrage(text)` | Kleinbuchstaben, alles außer Buchstaben und Ziffern wird Leerzeichen, vorn und hinten ein Leerzeichen. Damit passt „wer“ nicht in „schwerer“. |
| `findeSchluesselAntwort(frage)` | Leere Frage → Begrüßung; erstes Stichwort, das als ganzes Wort in der Frage steht → dieser Eintrag; sonst die Ausweich-Antwort. Liefert `{schluesselwort, text}`. |
| `teileAmSchluesselwort(text, schluesselwort)` | Zerlegt den Text in `[{text, hervorgehoben}]`. Hervorgehoben wird jedes Vorkommen des Schlüsselworts als ganzes Wort („Chris“ ja, „Christian“ nein), ohne Trennstellen, Groß-/Kleinschreibung egal. |
| `zerlegeInSaetze(text)` | Teilt nach `.`, `!` oder `?` mit folgendem Leerzeichen. Jeder Satz wird im Briefpapier ein Listenpunkt. |
| `frageChrisBot(frage, wartezeitMs)` | Promise, das nach der Wartezeit (Standard 0,5–1,2 s) `findeSchluesselAntwort(frage)` liefert. |

## overlay/overlay.js (Variante A)

| Name | Was es tut |
|---|---|
| Config-Änderungen | Keine Regler, kein „Nochmal“, keine `=`-Testhilfe (wie die Besucherfassung). Begrüßung schreibt CHRIS. `restBrightness` 100: Das Wort bleibt stehen, bis die nächste Antwort kommt. Am Handy 46 statt 34 Spalten, damit 10 Zeichen in eine Zeile passen. |
| `layoutTextBlock(...)` | Ersetzt die gleichnamige Funktion aus `labyrinth.js`. Waagrecht mittig wie bisher, senkrecht liegt die Mitte des Textblocks bei 24 % der Höhe (aber nie näher am Rand als erlaubt). So bleibt die untere Hälfte frei für das Overlay. |
| `zeigeImOverlay(frage, antwort)` | Schreibt „Ihre Frage: …“ und den Antworttext ins Overlay, das Schlüsselwort als rot leuchtendes `span`. |
| `stelleFrage(frage)` | Zeigt die Frage sofort im Overlay, der alte Text wird blasser. Wenn die Antwort da ist: Text ins Overlay und `showAnswer(schluesselwort)` aus `seite.js`, das Labyrinth schiebt weiter und der Punkt schreibt das Wort. Antworten auf überholte Fragen werden verworfen. |
| Submit-Lauscher | Hängt am `document` in der Capture-Phase und fängt das Absenden ab, bevor der Lauscher von `seite.js` es bekommt (der würde sonst die Platzhalter aus Prototyp 6 schreiben). |
| Start | Begrüßung ins Overlay, drei Vorschlagsknöpfe darunter. |

## briefpapier/briefkopf.js (Variante B)

Vorbild ist `corporate-identity/lebenslauf/streifen.js` (dort fest CHRIS, in Millimetern, still).
Hier: beliebiges Wort, Pixel, und der Lichtpunkt zeichnet den Weg Schritt für Schritt.

| Name | Was es tut |
|---|---|
| `BRIEFKOPF` | 12 Zeilen hoch wie auf Papier, 9 Zellen Rand links, höchstens 13 px je Zelle, Anschriftfeld ab 900 px Breite, Tempo je Wegart (Buchstaben 40, Verbindungen 120 Zellen/s). |
| `BRIEFKOPF_FARBEN` | Farben und Schichten von Wänden und Spur wie im Streifen. Strichstärken als Anteil der Zellgröße (`WANDSTAERKE_JE_ZELLE`, `SPURSTAERKE_JE_ZELLE`). |
| `briefkopfBuchstaben(wort)` | Großbuchstaben ohne Trennstellen, nur Zeichen, die die Schrift kennt. |
| `briefkopfBreiteInZellen(wort, randLinks)` | Rand plus Wortbreite (4 Zellen je Zeichen, hinter dem letzten entfällt der Abstand). |
| `baueBriefkopfRoute(wort, spalten, zeilen, randLinks, random)` | Weg des Punkts: vom linken Rand in Windungen zum Wort, dann durch die Buchstaben. Wie `buildStripRoute`, aber mit beliebigem Wort. Liefert `{schritte, eingang}`. |
| `zahlAusText(text)` | Immer dieselbe Zahl für denselben Text, als Startwert des Labyrinths. |
| `briefkopfGedimmt(farbe, helligkeit)` | Mischt eine Farbe mit dem Hintergrund (für die gedimmten Wände). |
| `svgElement(name, attribute)` | Legt ein SVG-Element mit Attributen an. |
| `briefkopfWandPfad(labyrinth, eingang, zelle)` | Alle Wände als ein Pfad, Eingang links offen. |
| `briefkopfSpurPfad(schritte, art, bis, zelle)` | Pfad aller Schritte einer Art bis zu einem Schritt. |
| `zeigeBriefkopf(behaelter, wort, startText, sofort)` | Passt Zellgröße an die Breite an (das Wort muss neben das Anschriftfeld passen), baut Labyrinth und SVG und lässt den Punkt das Wort schreiben. `sofort`: gleich fertig, ohne Animation (nach Größenänderung). Liefert eine Funktion, die die Animation abbricht. |

## briefpapier/index.html (Variante B)

| Name | Was es tut |
|---|---|
| `schreibeImKopf(wort, startText)` | Bricht die laufende Animation ab und schreibt das neue Wort in einem neuen Labyrinth. |
| Größenänderung | Nach 150 ms Ruhe dasselbe Wort neu einpassen, ohne Animation. |
| `listenpunkt(satz, schluesselwort)` | Ein `li` mit dem Satz, das Schlüsselwort darin rot. |
| `fuelleBegruessung()` | Begrüßungstext unter die Überschrift, „Chris“ rot. |
| `stelleFrage(frage)` | Legt den Eintrag „Frage n“ sofort oben an (mit „ChrisBot schreibt …“), füllt ihn mit der Antwort als Aufzählung und lässt den Briefkopf das Schlüsselwort schreiben, sofern inzwischen keine neuere Frage kam. |

## Was geprüft ist und was nicht

- Geprüft (Chrome, Playwright): beide Einzeldateien bei 1280 × 800 und 390 × 780, je zwei
  Fragen, keine Fehler in der Konsole; Screenshots angesehen.
- Nicht geprüft: Safari/iOS, Firefox, Bildschirmleser, echte Ladezeiten des Sprachmodells.
- Die Schriften Ubuntu und Ubuntu Mono sind nicht eingebettet. Wo sie fehlen, greifen
  DejaVu bzw. Systemschriften.
- In Variante A schimmert das Labyrinth unscharf durch das Overlay. Das ist gewollt
  (halbtransparent mit Weichzeichner), sieht aber an manchen Stellen nach Buchstaben aus.
