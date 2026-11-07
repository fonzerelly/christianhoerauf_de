# ui

Die Verbindung zur Seite: Fragefeld, Bühne, Takt, Fenstergröße. Die Klassen nehmen schmale Schnittstellen
statt echter DOM-Elemente (`{ addEventListener }`, `{ textContent }` …), damit sie ohne Browser getestet
werden. `main.ts` übergibt die echten Elemente.

| Datei                        | Was sie tut                                                                                                |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `url-parameters.ts`          | `readUrlParameters`: `?seed=` und `?profil=`.                                                              |
| `device-profile-selector.ts` | `selectProfile`: Geräteprofil nach Fensterbreite.                                                          |
| `question-form.ts`           | `QuestionForm`: Fragefeld und „Senden“.                                                                    |
| `spoken-answer.ts`           | `SpokenAnswer`: der `aria-live`-Bereich für Screenreader.                                                  |
| `conversation.ts`            | `Conversation`: Frage → Antwortquelle → Bühne und Screenreader.                                            |
| `stage.ts`                   | `Stage`: Renderer, Ablauf, wann gezeichnet wird, Neuaufbau bei neuer Größe.                                |
| `step-runner.ts`             | `runInTasks`: rechnet eine Berechnung in Stücken, jedes in einer eigenen Aufgabe.                          |
| `prepared-page-source.ts`    | `PreparedPageSource`: die Seitenquelle der Bühne (Seiten in Stücken erzeugen, erste Seite vorab zeichnen). |
| `phase-indicator.ts`         | `PhaseIndicator`: Abschnitt der Animation als `data-phase`.                                                |
| `stage-size-watcher.ts`      | `StageSizeWatcher`: baut neu, wenn die Bühne anders breit wird.                                            |
| `stage-frame.ts`             | `applyStageLayout`: Höhe der Bühne und Anfang/Breite des Labyrinths an die Seite.                          |
| `animation-loop.ts`          | `AnimationLoop`: der Takt (ein Bild nach dem anderen).                                                     |
| `required-element.ts`        | `requireElement`: Element der Seite holen und prüfen.                                                      |
| `test-hooks.ts`              | `readTestHooks`: Uhr, Bildtakt und Startwert, die ein Test mitgibt.                                        |

## readUrlParameters, selectProfile

`readUrlParameters(query)` liest `?seed=<ganze Zahl ab 0>` und `?profil=handy|desktop`. Fehlendes oder
Ungültiges (`seed=abc`, `-3`, `1.5`, `profil=tablet`) fehlt im Ergebnis.
`selectProfile(windowWidth, requested?)` gibt den Wunsch aus der Adresse zurück, sonst `desktop` ab
700 px, darunter `handy`. Gewählt wird einmal beim Laden.

## QuestionForm, SpokenAnswer

| Name                                             | Was sie konkret tut                                                                                                                                                                                                                               |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `QuestionForm.constructor(form, input, options)` | Hört auf `submit` des Formulars (verhindert das Neuladen). Beim Verlassen des Felds passiert nichts mehr: Der Sprung nach oben (iOS-Notlösung bis Schritt 12.1) ließ auf der scrollenden Seite den ersten Mausklick auf „Senden“ ins Leere gehen. |
| `QuestionForm.submit` (privat)                   | Schneidet Leerraum ab; leer: nichts. Sonst die Frage melden, das Feld leeren und - am Handy - das Feld verlassen (schließt die Tastatur).                                                                                                         |
| `SpokenAnswer.show(text)`                        | Schreibt den Originaltext (ohne Trennstellen-Zeichen) in den Bereich mit `aria-live="polite"`.                                                                                                                                                    |

## closesKeyboardAfterSending

| Funktion                                                   | Was sie konkret tut                                                                                                                                                                                     |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `closesKeyboardAfterSending(profileWants, hasTouchScreen)` | Liefert `true` nur, wenn das Profil das Verlassen des Fragefelds will (Handy) **und** das Gerät einen Touchscreen hat (`pointer: coarse`). Am Rechner im schmalen Fenster behält das Feld so den Fokus. |

## Conversation

| Methode                              | Was sie konkret tut                                                                                                                                                                                                                           |
| ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `constructor(source, stage, spoken)` | Nimmt Antwortquelle, Bühne und Screenreader-Bereich.                                                                                                                                                                                          |
| `start()`                            | Holt die Begrüßung (leere Frage).                                                                                                                                                                                                             |
| `ask(question)`                      | Holt die Antwort auf die Frage.                                                                                                                                                                                                               |
| `present` (privat)                   | Gibt der Bühne das Versprechen für den Inhalt (`contentOf`: Text, Bild oder Foto). Sobald die Antwort da ist (und keine neuere Frage gestellt wurde), merkt sie sie sich und liest ihren Text vor; ein unbekanntes Gimmick bleibt unbeachtet. |

## Stage

| Methode                    | Was sie konkret tut                                                                                                                                                                                                                                                                                         |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `constructor(parts)`       | Misst die Bühne und baut den Ablauf mit dem Grundstartwert.                                                                                                                                                                                                                                                 |
| `builtFor`                 | Die Größe der Bühne in Pixeln, für die gebaut wurde.                                                                                                                                                                                                                                                        |
| `tick(seconds)`            | Lässt die Animation weiterlaufen und zeichnet ein Bild - aber nur, wenn sich etwas bewegt (oder eben bewegt hat), eine Bildstörung läuft oder neu gezeichnet werden muss. Danach lässt es die Wände einer neuen nächsten Seite vorab zeichnen (`prepareNextPage`).                                          |
| `show(reply)`              | Eine Frage wurde gestellt: merkt sich das Versprechen und gibt es dem Ablauf.                                                                                                                                                                                                                               |
| `prepareNextPage` (privat) | Gibt es eine nächste Seite, die noch nicht vorbereitet wird, startet es `renderer.prepare(seite)` über `runInTasks`: Stück für Stück in eigenen Aufgaben (`scheduleTask`), damit das Bild nicht stockt. Dieselbe Seite wird nur einmal vorbereitet; nach `refresh` und `rebuild` gilt wieder alles als neu. |
| `refresh()`                | Wirft das Vorgezeichnete weg und zeichnet das nächste Bild neu.                                                                                                                                                                                                                                             |
| `rebuild()`                | Die Bühne hat eine andere Größe: misst neu, stellt den Renderer um und baut einen neuen Ablauf, der die aktuelle Antwort (oder die, auf die gewartet wird) von vorn schreibt. Startwert wie bei einem frischen Laden in dieser Größe.                                                                       |

## runInTasks, PreparedPageSource

| Name                                                               | Was sie konkret tut                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `runInTasks(steps, scheduleTask)`                                  | Rechnet eine Berechnung in Stücken (`Steps` der Domäne) ab: Jedes Stück läuft in einer eigenen Aufgabe, die `scheduleTask` einreiht (im Browser `setTimeout(…, 0)`). Dazwischen kann der Browser Bilder zeichnen und Eingaben bearbeiten. Das Versprechen liefert das Ergebnis; wirft ein Stück, scheitert es mit dem Fehler. |
| `PreparedPageSource.constructor(producer, preparer, scheduleTask)` | Nimmt den Erzeuger der Seiten (der `AnswerPaginator`), den Vorbereiter (der `Renderer`) und die Einreihung von Aufgaben.                                                                                                                                                                                                      |
| `PreparedPageSource.paginate(answer, seed, exitBefore?)`           | Erzeugt die Seiten mit `paginateInSteps` (jedes Stück eine Aufgabe), lässt danach die erste Seite vorab zeichnen (`renderer.prepare`, ebenfalls Stück für Stück) und löst das Versprechen erst dann ein. Wenn die Animation die Seite zeigt, kostet das erste Bild so nur noch das Kopieren.                                  |
| `PreparedPageSource.restingStepOf(page)`                           | Reicht die Anfrage an den Erzeuger weiter (Haltepunkt einer Seite).                                                                                                                                                                                                                                                           |

## PhaseIndicator

`show(phase)` schreibt den Abschnitt der Animation (`writing`, `resting`, `fading`, `scrolling`,
`waiting`) als `data-phase` an die Bühne, aber nur wenn er sich ändert. Besucher sehen nichts davon;
die Bildtests warten damit auf den Haltepunkt oder das Weiterschieben.

## applyStageLayout

`applyStageLayout(stage, page, layout)` setzt die Höhe der Bühne auf `layout.viewHeight` (Reihen ×
Zellgröße, ADR 0007) und an der Seite die CSS-Variablen `--maze-left` (Rand des Labyrinths,
`offsetX`) und `--maze-width` (Spalten × Zellgröße). Das Stylesheet rückt damit Zeitleiste,
Antwortbereich, Folgefragen, Fragefeld und Hinweis an die linke Kante des Labyrinths und macht
Zeitleiste und Fragefeld genau so breit. `main.ts` ruft es bei jedem Messen der Bühne.

## StageSizeWatcher

`notifyChange()` wartet 0,3 s, bis die Größe ruhig ist (jede neue Meldung bricht das Warten ab), und prüft
dann: andere Breite → `rebuild`; sonst nichts. Die Höhe der Bühne ergibt sich seit Schritt 12.3 aus Reihen
und Zellgröße; die Tastatur-Falle am Handy (niedrigeres Fenster beim Tippen) gibt es nicht mehr.

## AnimationLoop

| Methode                            | Was sie konkret tut                                                                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `start()`                          | Fordert ein Bild an. In jedem Bild: `stage.tick(Zeit seit dem vorigen Bild)`, dann das nächste Bild anfordern.                        |
| `pageVisibilityChanged(isVisible)` | Setzt die Zeitmessung zurück; kommt die Seite zurück, wirft die Bühne das Vorgezeichnete weg (der Browser könnte es verworfen haben). |

## requireElement, readTestHooks

`requireElement(root, id, type)` liefert das Element oder scheitert mit `Auf der Seite fehlt das Element
"<id>"` bzw. `… ist von der falschen Art`. `readTestHooks(scope)` liest `scope.labyrinthTestHooks`
(`clock`, `requestFrame`, `scheduleTask`, `randomSeed` und optional `tuning`, Abstimmungswerte, die den des Profils ersetzen), das nur ein Test per Playwright-`addInitScript` setzt; fehlt es
oder ist es unvollständig: `undefined`.
