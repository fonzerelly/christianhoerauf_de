# Prototyp 10: Redesign mit Überblendung, Aufteilungen und Lebenslauf

Wegwerf-Prototyp zum Grilling vom 2026-11-03 (Plan: `docs/frontend/IMPLEMENTATION_PLAN.md`,
Schritt 12.0; Begründung: `docs/frontend/adr/0006-antwort-als-text-labyrinth-als-akzent.md`).
Er soll zeigen, ob die Beschlüsse im Browser so wirken wie gedacht, bevor das Frontend mit TDD
umgebaut wird. Keine Tests (Prototyp).

**Was er zeigt:**
- Die Antwort steht sofort als Text in der **Überblendung**; der Lichtpunkt schreibt nur das
  **Stichwort**.
- Die **Aufteilung** wechselt von Antwort zu Antwort: Lage (unten, oben, Band, auf dem Desktop
  auch links/rechts senkrecht) × Breite (voll, links/rechts eingerückt) × Ausrichtung des
  Stichworts. Nie genau dieselbe zweimal hintereinander.
- Begrüßung mit persönlichem Link, offener **Lebenslauf-Leiste** (Desktop) und
  **Einstiegsfragen** per Klick.
- **Folgefragen-Liste**, die nach oben aus dem Fragefeld fährt.
- Scanlines und dunkle Ecken setzen sich über der Überblendung fort, ohne Flimmern.

**Nicht drin:** Die Route meidet die Überblendung noch nicht (Q25), der Lichtpunkt läuft also
manchmal unter dem Text durch. Gimmicks. Der echte Bot (die Antworten sind Lorem ipsum, der
Reihe nach, egal was man fragt).

## Ansehen

```bash
./baue-einzeldatei.sh   # holt den Lebenslauf und schreibt /mnt/share/website/redesign/index.html
```

Mit persönlichem Link (Beispiel aus `backend/schema/personal-link.examples.json`, „Frau Erika
Muster“, Variante 4711): an die Adresse `#NDcxMXxGcmF1IEVyaWthIE11c3RlcnxlOWJk` anhängen.
Kaputter Link zum Ausprobieren: `#NDcxMXxGcmF1IEVyaWthIE11c3Rlcn`.

Lokal geöffnet verbietet der Browser den Abruf von `/lebenslauf` (CORS, Herkunft `null`); dann
nimmt der Prototyp `lebenslauf-schnappschuss.js`, das `hole-lebenslauf.sh` erzeugt. Die Datei
steht in `.gitignore`, weil das Repo öffentlich ist.

## Was beim Bauen aufgefallen ist

- **Begrüßung bei 1280 × 800 und 1440 × 900:** Neben der offenen Leiste (30 %) passen der Name
  („HALLO / FRAU / MUSTER“, drei Zeilen) und der Begrüßungstext nicht übereinander ins Labyrinth.
  Der Prototyp schreibt dann nur HALLO. Ab 1920 × 1080 klappt „HALLO FRAU / MUSTER“. Auf dem
  Handy (Leiste zu) passt der Name immer.
- **Lange Stichwörter** (SPRACHERKENNUNG, TESTING STRATEGIES) passen bei 1280 × 800 nur in
  Aufteilungen oben oder unten mit voller Breite oder passender Ausrichtung; Band und senkrechte
  Lagen bleiben dort kurzen Wörtern vorbehalten. Bei 1920 × 1080 passt alles überall.
- **Handy:** Die Folgefragen-Liste verdeckt den unteren Teil der Überblendung, wenn die unten
  liegt. Der Reiter „LEBENSLAUF“ liegt über dem rechten Rand der Überblendung.

## Dateien

| Datei | Inhalt |
|---|---|
| `index.html` | Seite und Aussehen. Aus Prototyp 9a abgeleitet; die Regler-Elemente bleiben versteckt drin, weil `seite.js` sie erwartet. |
| `vorher.js` | Config-Änderungen, die vor dem Start von `seite.js` gelten müssen. |
| `inhalte.js` | Persönlicher Link, Begrüßung, vorgetäuschter Bot. |
| `aufteilung.js` | Katalog der Aufteilungen; Rechnung, wo Überblendung und Stichwort liegen. Ohne DOM. |
| `redesign.js` | Ersetzt Funktionen aus Prototyp 6, Überblendung, Lebenslauf-Leiste, Folgefragen, Start. |
| `hole-lebenslauf.sh` | Holt `/lebenslauf` als `lebenslauf-schnappschuss.js`. |
| `baue-einzeldatei.sh` | Fügt alles zu einer HTML-Datei zusammen. |

Reihenfolge der Skripte: Prototyp 6 (`config.js` … `einstellungen.js`), `vorher.js`, `seite.js`,
dann Schnappschuss, `inhalte.js`, `aufteilung.js`, `redesign.js`. `seite.js` startet beim Laden
sofort; `redesign.js` baut die Begrüßung danach neu.

## vorher.js

| Name | Was es tut |
|---|---|
| Config-Änderungen | Keine Regler, kein „Nochmal“, keine `=`-Testhilfe. `restBrightness` 100: Das Stichwort bleibt stehen, bis die nächste Antwort kommt. |

## inhalte.js

| Name | Was es tut |
|---|---|
| `fnv1a(text)` | FNV-1a mit 32 Bit über die Unicode-Zeichen, wie `personal_link.py`. |
| `pruefsumme(nummer, name)` | Die ersten 4 Hex-Ziffern von `fnv1a("Nummer|Name")`. |
| `lesePersoenlichenLink(fragment)` | Liest den Teil hinter `#` (base64url von „Nummer|Name|Prüfsumme“). Liefert `{art: "keiner"}`, `{art: "kaputt"}` oder `{art: "gueltig", nummer, name}`. Geprüft gegen alle sechs Beispiele aus `personal-link.examples.json`. |
| `schriftKannNamen(name)` | Ob die Labyrinth-Schrift jedes Zeichen des Namens kennt. |
| `stichwortDerBegruessung(link)` | „HALLO“ plus Anrede und Nachname („Frau Erika Muster“ → „HALLO FRAU MUSTER“); ohne gültigen Link oder bei unbekannten Zeichen nur „HALLO“. |
| `textDerBegruessung(link)` | Die Absätze des Begrüßungstexts (Entwurf): Anrede, wie die Seite funktioniert, Lebenslauf; bei kaputtem Link ein Satz dazu. |
| `loremMitLaenge(zeichen)` | Lorem ipsum, das vor der Länge an einem Wortende mit Punkt aufhört. |
| `VORGETAEUSCHTE_ANTWORTEN` | Sechs Antworten mit 120–400 Zeichen, Stichwort (eine ohne) und 0–3 Folgefragen. |
| `frageVorgetaeuschtenBot()` | Liefert nach 0,8–2,2 s die nächste dieser Antworten, der Reihe nach. |

## aufteilung.js

| Name | Was es tut |
|---|---|
| Konstanten | Goldener Schnitt (0,382 / 0,618), Rand und Abstand (2 Zellen), höchstens 3 Zeilen Stichwort, Höhe der Überblendung höchstens 50 % (Desktop) bzw. 60 % (Handy), eingerückte Breite 61,8 % bzw. 85 %, mindestens 4 Zellen hoch. |
| `katalog(profil)` | Alle Kombinationen: Desktop 33 (unten/oben/Band × 3 Breiten × 3 Ausrichtungen, dazu links/rechts senkrecht × 3), Handy 27. |
| `gleicheAufteilung(a, b)` | Ob zwei Aufteilungen in allen drei Merkmalen übereinstimmen. |
| `istSenkrecht(aufteilung)` | Lage links oder rechts. |
| `rechteckDerUeberblendung(aufteilung, raster, misseHoehe)` | Das Rechteck der Überblendung in Zellen. Senkrecht: 38,2 % breit, so hoch wie der Text, mittig. Waagrecht: volle oder eingerückte Breite, so hoch wie der Text (begrenzt), unten, oben oder mit der Mitte auf 61,8 % der Höhe (Band). Bleibt links von der offenen Lebenslauf-Leiste. |
| `platzDesStichworts(stichwort, aufteilung, ueberblendung, raster, returnBandRows)` | Wo das Stichwort steht: bei waagrechten Lagen darüber (unten, Band) oder darunter (oben), bündig zur linken oder rechten Textkante oder mittig; bei senkrechten daneben, oben, mittig oder unten bündig. Bricht mit `wrapText` aus Prototyp 6 um. Liefert `{lines, block}` oder `null`, wenn es nicht in 3 Zeilen bzw. nicht auf die Bühne passt. |
| `planeSeite(...)` | Probiert den Wunsch (Begrüßung, oder dieselbe nach Größenänderung) und dann den gemischten Katalog ohne die vorige Aufteilung, bis das Stichwort passt. Passt nichts: ohne Stichwort, nur ein Pfad. |
| `begrenze(wert, min, max)` | Klemmt einen Wert ein. |

## redesign.js

| Name | Was es tut |
|---|---|
| `profil()` | „handy“ oder „desktop“ aus `body[data-profile]`. |
| `breiteDerLeiste()` | Breite der Lebenslauf-Leiste: 30 % der Bühne, mindestens 360 px. |
| `nutzbareSpalten()` | Spalten, die Überblendung und Stichwort nutzen dürfen: auf dem Desktop bei offener Leiste nur die links von ihr. |
| `setzeLebenslaufOffen(offen)` | Klappt die Leiste auf oder zu und lädt sie beim ersten Aufklappen. |
| `ladeLebenslauf()` | Holt `/lebenslauf` (mit `?variante=` aus dem Link); geht das nicht, der Schnappschuss; fehlt der auch, „Gerade nicht erreichbar.“ und „Nochmal versuchen“. |
| `zeigeLebenslauf(daten)` | Baut Abschnitte, Stationen und Projekte in die Leiste. |
| `stationsEintrag(eintrag)` | Zeit, Titel, Organisation; jeder Stichpunkt als Knopf mit der Einstiegsfrage *Erzähl mir mehr über „…“ bei <Firma>.* |
| `projektEintrag(eintrag)` | Projekttitel als Knopf (*Erzähl mir mehr über das Projekt „…“.*), darunter der Text. Links erscheinen nicht. |
| `einstiegsKnopf(beschriftung, frage)` | Knopf, der die Frage ins Fragefeld schreibt (ohne abzuschicken) und die Folgefragen schließt. |
| `absatz(text, klasse)` | Ein `<p>` mit Text und Klasse. |
| `setzeFolgefragen(fragen)` | Füllt die Folgefragen-Liste, zeigt den Pfeil am Feld und öffnet sie, wenn es Fragen gibt. |
| `oeffneFolgefragen()` / `schliesseFolgefragen()` | Öffnen und schließen die Liste. Leeres Feld mit Fokus öffnet, Tippen schließt, der Pfeil schaltet um. |
| `fuelleUeberblendung(element, inhalt)` | Schreibt Frage (klein) und Absätze der Antwort in eine Überblendung. |
| `misseHoeheInPixeln(inhalt, breite)` / `misseHoeheFuer(inhalt)` | Misst in einem unsichtbaren Zwilling, wie hoch der Text bei einer Breite (in Zellen) wird. |
| `ueberblendungDer(seite)` | Die Überblendung einer Labyrinth-Seite; legt sie beim ersten Mal an. |
| `legeUeberblendung(element, seite, verschiebung)` | Setzt Lage und Größe in Pixeln (samt Verschiebung beim Weiterschieben) und richtet Scanlines und dunkle Ecken am Canvas aus. |
| `folgeDenSeiten()` | Läuft in jedem Bild: Überblendungen der sichtbaren Seiten an ihren Platz, die übrigen entfernen. So schiebt die Überblendung mit ihrer Seite weiter. |
| `createAnswer` (ersetzt) | Hängt an jede neue Antwort den Inhalt für die Überblendung (`naechsterInhalt`). |
| `buildAnswerPages` (ersetzt) | Plant die Seite mit `planeSeite` (bei der Begrüßung notfalls mit HALLO), misst die Texthöhe und baut genau eine Labyrinth-Seite um das Stichwort. |
| `layoutTextBlock` (ersetzt) | Nimmt den vorab geplanten Block. |
| `appendTextRoute` (ersetzt) | Wie in Prototyp 6, nur stehen die Zeilen links-, rechtsbündig oder mittig im Block. |
| `zeigeWarten(frage)` | Schreibt die neue Frage in die aktuelle Überblendung und blasst den alten Text ab. |
| `stelleFrage(frage)` | Fragt den vorgetäuschten Bot; ist die Antwort nicht überholt: Inhalt vormerken, Stichwort schreiben lassen (`showAnswer`), Screenreader-Text und Folgefragen setzen. |
| Absenden (Lauscher) | Fängt das Absenden vor `seite.js` ab; klappt den Lebenslauf bei der ersten Frage zu (auf dem Handy bei jeder). |
| `starteRedesign()` | Liest den Link, öffnet die Leiste auf dem Desktop, baut die Begrüßung neu und startet `folgeDenSeiten`. |
