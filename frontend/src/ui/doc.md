# ui

Die Verbindung zur Seite: Fragefeld, Bühne, Takt, Fenstergröße. Die Klassen nehmen schmale Schnittstellen
statt echter DOM-Elemente (`{ addEventListener }`, `{ textContent }` …), damit sie ohne Browser getestet
werden. `main.ts` übergibt die echten Elemente.

| Datei                        | Was sie tut                                                                                                |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `url-parameters.ts`          | `readUrlParameters`: `?seed=` und `?profil=`.                                                              |
| `device-profile-selector.ts` | `selectProfile`: Geräteprofil nach Fensterbreite.                                                          |
| `question-form.ts`           | `QuestionForm`: Fragefeld und „Senden“.                                                                    |
| `answer-area.ts`             | `AnswerArea`: Antwortbereich (Frage, Antwort, Warten) und Folgefragen; der `aria-live`-Bereich.            |
| `dom-like.ts`                | `ElementLike`, `ElementFactory`: der Ausschnitt des DOM, mit dem `AnswerArea` baut.                        |
| `conversation.ts`            | `Conversation`: Frage → Antwortquelle → Bühne und Antwortbereich.                                          |
| `stage.ts`                   | `Stage`: Renderer, Ablauf, wann gezeichnet wird, Neuaufbau bei neuer Größe.                                |
| `step-runner.ts`             | `runInTasks`: rechnet eine Berechnung in Stücken, jedes in einer eigenen Aufgabe.                          |
| `prepared-page-source.ts`    | `PreparedPageSource`: die Seitenquelle der Bühne (Seiten in Stücken erzeugen, erste Seite vorab zeichnen). |
| `phase-indicator.ts`         | `PhaseIndicator`: Abschnitt der Animation als `data-phase`.                                                |
| `stage-size-watcher.ts`      | `StageSizeWatcher`: baut neu, wenn die Bühne anders breit wird.                                            |
| `stage-frame.ts`             | `applyStageLayout`: Höhe der Bühne und Anfang/Breite des Labyrinths an die Seite.                          |
| `animation-loop.ts`          | `AnimationLoop`: der Takt (ein Bild nach dem anderen).                                                     |
| `required-element.ts`        | `requireElement`: Element der Seite holen und prüfen.                                                      |
| `test-hooks.ts`              | `readTestHooks`: Uhr, Bildtakt und Startwert, die ein Test mitgibt.                                        |
| `timeline/timeline-view.ts`  | `TimelineView`: baut, misst und legt die Zeitleiste; Laden und Fehler.                                     |
| `timeline/timeline.ts`       | `Timeline`: lädt den Lebenslauf, zeigt Stationen oder Fehler, „Nochmal versuchen“.                         |
| `timeline/year-of-date.ts`   | `yearOfDate`: ein Datum als Jahr mit Nachkommastellen.                                                     |

## readUrlParameters, selectProfile

`readUrlParameters(query)` liest `?seed=<ganze Zahl ab 0>` und `?profil=handy|desktop`. Fehlendes oder
Ungültiges (`seed=abc`, `-3`, `1.5`, `profil=tablet`) fehlt im Ergebnis.
`selectProfile(windowWidth, requested?)` gibt den Wunsch aus der Adresse zurück, sonst `desktop` ab
700 px, darunter `handy`. Gewählt wird einmal beim Laden.

## QuestionForm

| Name                                             | Was sie konkret tut                                                                                                                                                                                                                               |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `QuestionForm.constructor(form, input, options)` | Hört auf `submit` des Formulars (verhindert das Neuladen). Beim Verlassen des Felds passiert nichts mehr: Der Sprung nach oben (iOS-Notlösung bis Schritt 12.1) ließ auf der scrollenden Seite den ersten Mausklick auf „Senden“ ins Leere gehen. |
| `QuestionForm.submit` (privat)                   | Schneidet Leerraum ab; leer: nichts. Sonst die Frage melden, das Feld leeren und - am Handy - das Feld verlassen (schließt die Tastatur).                                                                                                         |

## closesKeyboardAfterSending

| Funktion                                                   | Was sie konkret tut                                                                                                                                                                                     |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `closesKeyboardAfterSending(profileWants, hasTouchScreen)` | Liefert `true` nur, wenn das Profil das Verlassen des Fragefelds will (Handy) **und** das Gerät einen Touchscreen hat (`pointer: coarse`). Am Rechner im schmalen Fenster behält das Feld so den Fokus. |

## AnswerArea

Baut mit einer schmalen DOM-Schnittstelle (`dom-like.ts`, generisch über den Elementtyp: im Browser
`HTMLElement`, im Test `FakeElement` aus `test-support/fake-dom.ts`).

| Methode                        | Was sie konkret tut                                                                                                                                                                                             |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `constructor(parts)`           | Nimmt `document`, Antwortbereich, Platz für Folgefragen, Fragefeld und drei Funktionen: wo der Bereich beginnt (`areaTop`), wie hoch das Fenster ist, und wie zum Bereich gescrollt wird.                       |
| `showWaiting(question)`        | Zeigt „Ihre Frage: …“ (Klasse `question`), „Der Bot denkt nach“ (`thinking`) und die Absätze der alten Antwort; Klasse `waiting` am Bereich (CSS macht die alte Antwort blass). Folgefragen weg.                |
| `showAnswer(question, answer)` | Teilt den Text an Leerzeilen in Absätze (Klasse `answer`, ohne Trennstellen-Zeichen), davor die Frage (bei der Begrüßung keine), entfernt `waiting`, zeigt die Folgefragen. Nach einer Frage: `revealIfHidden`. |
| `showSuggestions` (privat)     | Je Folgefrage ein Knopf (`type="button"`); ein Klick trägt sie ins Fragefeld ein und setzt den Fokus dorthin, schickt aber nicht ab (Q22). Ohne Folgefragen ist der Platz versteckt.                            |
| `revealIfHidden` (privat)      | Liegt der Anfang des Bereichs über dem Fenster oder tiefer als 60 % der Fensterhöhe, scrollt sie hin (Q32); `main.ts` scrollt sanft, bei weniger Bewegung sofort.                                               |

## Conversation

| Methode                                  | Was sie konkret tut                                                                                                                                                                                                                                                                    |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `constructor(source, stage, answerArea)` | Nimmt Antwortquelle, Bühne und Antwortbereich (`showWaiting`, `showAnswer`).                                                                                                                                                                                                           |
| `start(greeting)`                        | Zeigt die Begrüßung, die `main.ts` aus dem persönlichen Link baut (Stichwort mit bis zu zwei Zeilen je Seite); die Antwortquelle wird nicht gefragt.                                                                                                                                   |
| `ask(question)`                          | Zeigt im Antwortbereich das Warten (`showWaiting`) und holt die Antwort auf die Frage.                                                                                                                                                                                                 |
| `present` (privat)                       | Gibt der Bühne das Versprechen für den Inhalt (`contentOf`: Text, Bild oder Foto). Sobald die Antwort da ist (und keine neuere Frage gestellt wurde), zeigt sie sie im Antwortbereich (`showAnswer` mit der Frage, bei der Begrüßung ohne); ein unbekanntes Gimmick bleibt unbeachtet. |

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

## Zeitleiste (`timeline/`)

| Name                                  | Was sie konkret tut                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TimelineView.showLoading()`          | Zeigt „Stationen werden geladen …“ (Klasse `timeline-status`) und den Platz der Zeitleiste.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `TimelineView.showError(onRetry)`     | „Die Stationen sind gerade nicht erreichbar.“ und ein Knopf „Nochmal versuchen“ (`timeline-retry`), der `onRetry` ruft (Q35).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `TimelineView.showStations(stations)` | Baut Rahmen, verschiebbaren Bereich und Inhalt: Linie, je Station einen Block mit Knopf (Jahr, Organisation, Titel; `data-station`), je Engagement einen Block mit kleinem Knopf (Beschriftung, ganz in `title` und `aria-label` mit Zeitraum) und „heute“. Misst die Knöpfe der Stationen (+ 12 px Luft) und den sichtbaren Bereich, legt mit `layOutExpanded` (Platz für „heute“ 64 px, Engagement-Beschriftung mindestens 40 px) und setzt die Lage: Linie 26 px unter dem Anfang (ohne Engagements 0), Stationen 2 px darunter, Engagements 24 px hoch darüber, „heute“ 10 px hinter dem Ende der Linie. Der Inhalt wird so hoch wie die höchste Station + 8 px. Zuletzt steht „heute“ am rechten Rand (`scrollLeft` = ganze Breite, Q46). |
| `Timeline.load()`                     | Zeigt „wird geladen“, lädt den Lebenslauf, liest die Stationen (`stationsOf` mit `today`) und zeigt sie; scheitert es, den Fehler mit einem „Nochmal versuchen“, das wieder `load` ruft.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `Timeline.refresh()`                  | Zeichnet die geladenen Stationen neu (andere Breite); ohne Stationen nichts.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| `yearOfDate(date)`                    | Jahr + vergangener Anteil des Jahres (mittleres Jahr mit Schalttagen). Hier, weil die Domäne keine Uhr kennt.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |

`main.ts` baut die Zeitleiste nur, wenn es eine Adresse für den Lebenslauf gibt (`cvUrlOf`, im
Test `cvUrl` aus den Test-Hooks); sonst bleibt `#timeline` versteckt. Wird die Bühne anders breit,
zeichnet `refresh` neu.

## requireElement, readTestHooks

`requireElement(root, id, type)` liefert das Element oder scheitert mit `Auf der Seite fehlt das Element
"<id>"` bzw. `… ist von der falschen Art`. `readTestHooks(scope)` liest `scope.labyrinthTestHooks`
(`clock`, `requestFrame`, `scheduleTask`, `randomSeed` und optional `tuning`, Abstimmungswerte, die den des Profils ersetzen, `cvUrl`, woher die Zeitleiste den Lebenslauf holt, und `today`, ein festes „heute“ als Jahr), das nur ein Test per Playwright-`addInitScript` setzt; fehlt es
oder ist es unvollständig: `undefined`.
