# visual

Bildtests der ganzen Seite mit Playwright, im Docker-Image `mcr.microsoft.com/playwright`
(`npm run test:visual`; neue Referenzbilder: `npm run test:visual:update`, nur nach Abnahme).
Getestet wird der Produktionsbuild (`vite build` + `vite preview`), auf einem Handy (390 × 844,
Pixeldichte 3) und am Desktop (1440 × 900).

| Datei / Ordner                 | Inhalt                                                                   |
| ------------------------------ | ------------------------------------------------------------------------ |
| `labyrinth.spec.ts`            | Die Tests und ihre Hilfsfunktionen.                                      |
| `fixtures/*.json`              | Antwort-Dateien statt `public/content.json`, per `page.route` geliefert. |
| `labyrinth.spec.ts-snapshots/` | Die Referenzbilder, je `<name>-<handy\|desktop>.png`.                    |

## Wie die Bilder wiederholbar werden

Die Seite liest vor dem Start `window.labyrinthTestHooks`, das Playwright per `addInitScript` setzt
(`readTestHooks` in `src/ui/test-hooks.ts`; Besucher können es nicht setzen):

- eine **Uhr**, die nur weiterläuft, wenn der Test es sagt,
- einen **Bildtakt**, der nur auf Befehl ein Bild liefert (kein `requestAnimationFrame`),
- eine **Aufgaben-Einreihung**, die Aufgaben sofort ausführt: Die Seiten einer Antwort entstehen sonst in lauter
  kleinen Aufgaben (`setTimeout`), deren Ende der Test nicht abwarten könnte, ohne Bilder anzustoßen,
- einen **festen Startwert** für Flimmern und Bildstörung,
- optional **Abstimmungswerte**, die die des Geräteprofils ersetzen (eine Leuchtspur, die nicht verglimmt).

So zeigt jedes Bild genau denselben Augenblick der Animation, unabhängig von der Geschwindigkeit des
Rechners. Auf den Abschnitt der Animation wartet der Test über `data-phase` an der Bühne
(`PhaseIndicator`), statt Sekunden zu raten.

## Hilfsfunktionen in `labyrinth.spec.ts`

| Funktion                      | Was sie konkret tut                                                                                                                                                                                                                                |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `installTestHooks(tuning)`    | Läuft in der Seite vor ihren Skripten und legt `labyrinthTestHooks` an (auch `scheduleTask`: führt Aufgaben sofort aus). `advance(seconds, step)` stellt die Uhr in Bildern zu höchstens `step` Sekunden weiter und löst je Bild den Bildtakt aus. |
| `open(page, fixture, tuning)` | Liefert die Antwort-Datei, öffnet die Seite und löst Bilder aus, bis der Lichtpunkt zu schreiben beginnt (die Begrüßung kommt über das Netz, die Uhr steht still). Prüft, dass es keine Fehler in der Konsole gab.                                 |
| `advance(page, seconds)`      | Stellt die Uhr der Seite um `seconds` weiter.                                                                                                                                                                                                      |
| `ask(page, question)`         | Wartet bis zum Haltepunkt, stellt die Frage und lässt bei stehender Uhr Bilder laufen, bis die Antwort da ist (der Lichtpunkt läuft weiter). So hängt kein Bild davon ab, wie schnell die Antwort über das Netz kommt.                             |
| `askToShow(page)`             | `ask(page, "zeige")`, dann bis das Stichwort der Antwort zu schreiben beginnt.                                                                                                                                                                     |
| `advanceUntil(page, phase)`   | Stellt die Uhr in Schritten zu 0,1 s weiter, bis die Bühne im Abschnitt ist (höchstens 180 s); scheitert, wenn er nicht erreicht wird.                                                                                                             |

## Momente

| Test                            | Was das Bild zeigt                                                                                                        |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `<Zeichensatz>-schreiben`       | Eine Sekunde, nachdem das Stichwort begonnen hat: Lichtpunkt mitten im Wort, die Leuchtspur dahinter.                     |
| `<Zeichensatz>-haltepunkt`      | Der Lichtpunkt pulsiert am Haltepunkt; die Schrift steht, die Verbindungswege sind verglommen (ein Durchlauf, `ONE_RUN`). |
| `mehrere-seiten-weiterschieben` | Mitten im Weiterschieben zur zweiten Seite.                                                                               |
| `mehrere-seiten-haltepunkt`     | Haltepunkt der zweiten Seite.                                                                                             |
| `frage-weiterschieben`          | Eine Frage am Haltepunkt: Der Lichtpunkt läuft hinaus, mitten im Weiterschieben zur Antwort.                              |
| `bildstoerung`                  | 0,25 s nach Beginn, mit 100.000 Störungen pro Minute: Der Störbalken steht mitten im Bild.                                |
| `weniger-bewegung-haltepunkt`   | Mit `prefers-reduced-motion`: ruhiges Leuchten statt Pulsieren, kein Flimmern, keine Bildstörung.                         |

Seit Schritt 12.5 schreibt der Lichtpunkt nur das Stichwort. Die Begrüßung baut die Seite selbst
(ohne persönlichen Link „HALLO“); jeder Test fragt deshalb „zeige“ (`askToShow`) und fotografiert
das Stichwort der Antwort. Die Stichwörter haben höchstens 10 Zeichen, damit sie auch am Handy auf
eine Seite passen: `zeichensatz-1` (A–J), `zeichensatz-2` (K–T), `zeichensatz-3` (U–Z, ÄÖÜ),
`zeichensatz-4` (0–9), `ersatzglyphe` (`A€B-.?!`); `mehrere-seiten` hat ein langes Stichwort.
`askToShow` wartet mit `waitForFunction` auf das Weiterschieben, weil die Antwort über das Netz
kommt und `advanceUntil` dem Browser dafür keine Luft lässt.
