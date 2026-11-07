# answering

Woher die Antworten kommen. Aus der statischen Datei `public/content.json` oder, wenn beim Bauen
`VITE_ANSWER_URL` gesetzt ist, vom Bot im Backend (ADR 0003). Getauscht wird nur in `main.ts`.

| Datei                             | Was sie tut                                                           |
| --------------------------------- | --------------------------------------------------------------------- |
| `answer.ts`                       | `Answer` (Text, optional `Gimmick`) und `Gimmick`.                    |
| `answer-source.ts`                | Port `AnswerSource`: `answer(question): Promise<Answer>`.             |
| `content.ts`                      | `Content`, `parseContent`: prüft den Inhalt von `content.json`.       |
| `match-term-matcher.ts`           | `MatchTermMatcher`: wählt zu einer Frage die Antwort aus der Tabelle. |
| `fetch-json.ts`                   | `fetchJson`: holt eine Adresse und liefert den JSON-Inhalt.           |
| `static-content-answer-source.ts` | `StaticContentAnswerSource`: die Antwortquelle aus `content.json`.    |
| `http-answer-source.ts`           | `HttpAnswerSource`: fragt das Backend (Schritt 10).                   |
| `answer-content.ts`               | `contentOf`: was der Lichtpunkt für eine Antwort schreibt.            |

## AnswerSource

`answer(question)` liefert die Antwort auf die Frage. Eine **leere Frage liefert die Begrüßung**. Das
Versprechen wird immer eingelöst: Kann die Quelle nicht antworten, liefert sie eine Antwort, die das sagt.
Was aus einem `gimmick` wird, entscheidet `contentOf`.

## contentOf

`contentOf(answer)` macht aus einer `Answer` den Inhalt für die Bühne (`AnswerContent`): Gimmick
`heart` → das Herz, `face_with_hand_over_mouth` → der Smiley, `photo` → das Foto von Chris,
jeweils samt Text. Ohne Gimmick oder mit einem unbekannten (auch `toString`, die Tabellen sind
`Map`s) bleibt es beim Text.

## parseContent

`parseContent(json)` macht aus dem rohen JSON einen `Content` (`greeting`, `unknownAnswer`, `answers`
mit je `matchTerms` (Suchwörter) und `answer`). Fehlt etwas oder hat es die falsche Form, wirft sie einen
Fehler, der das Feld nennt (`content.json: answers[2].matchTerms muss eine Liste von Texten sein`). Unbekannte Felder
werden ignoriert.

## MatchTermMatcher

Hieß bis Schritt 12.1 `KeywordMatcher`. „Stichwort“ (`keyword`) ist seitdem das Wort, das der
Lichtpunkt zu einer Antwort schreibt; die Wörter, nach denen die statische Quelle in der Frage
sucht, heißen Suchwörter (`matchTerms`).

| Methode                        | Was sie konkret tut                                                                                                                                                                                                                |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `constructor(entries)`         | Nimmt die Tabelle.                                                                                                                                                                                                                 |
| `find(question)`               | Die Antwort des ersten Eintrags, von dem ein Suchwort als ganzes Wort (oder ganze Wortfolge) in der Frage vorkommt. Groß- und Kleinschreibung und Satzzeichen sind egal; "hi" passt nicht auf "Schiff". Passt nichts: `undefined`. |
| `simplifyForMatching` (privat) | Kleinbuchstaben, alles außer Buchstaben und Ziffern wird Leerzeichen, vorn und hinten genau eins. Aus "Wer bist du?" wird " wer bist du ".                                                                                         |

## fetchJson

`fetchJson(url, fetchFunction)`: Holt die Adresse. Ist die Antwort nicht erfolgreich, wirft sie
`<url>: Status <n>`; sonst liefert sie den JSON-Inhalt.

## StaticContentAnswerSource

| Methode                    | Was sie konkret tut                                                                                                                                                                             |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `constructor(loadContent)` | Nimmt eine Funktion, die den rohen JSON-Inhalt liefert (in `main.ts`: `fetchJson("/content.json", fetch)`).                                                                                     |
| `answer(question)`         | Leere Frage: Begrüßung. Sonst die Antwort des passenden Suchworts, sonst die Standardantwort. Schlägt das Laden oder Prüfen fehl: `UNAVAILABLE_ANSWER` („Das klappt gerade nicht …“).           |
| `loadOnce` (privat)        | Lädt und prüft den Inhalt beim ersten Mal und behält das Ergebnis (auch bei gleichzeitigen Fragen nur ein Aufruf). Bei einem Fehler wird nichts behalten: die nächste Frage versucht es erneut. |
| `textFor` (privat)         | Wählt den Text für Frage und Inhalt.                                                                                                                                                            |

## HttpAnswerSource

Nimmt beim Bauen `url`, `fetchFunction` (im Browser `fetch`), `greetingSource` (die `StaticContentAnswerSource`),
`timeoutMillis` (15 000) und `timeoutSignal` (im Browser `AbortSignal.timeout`).

| Methode / Funktion     | Was sie konkret tut                                                                                                                                                                                                                                                                |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `answer(question)`     | Leere Frage: fragt die `greetingSource`, das Backend nicht. Sonst `ask`; kommt dabei nichts Brauchbares heraus oder wirft etwas (Netzfehler, Zeitüberschreitung, kein JSON), liefert sie `UNREACHABLE_ANSWER` („Ich bin gerade nicht erreichbar. Versuch es gleich noch einmal.“). |
| `ask` (privat)         | Schickt `POST` mit `Content-Type: application/json` und `{"question": "<Frage>"}`; das Signal bricht nach `timeoutMillis` ab. Status 2xx und 400 werden gelesen (bei 400 steht im `text`, was an der Frage nicht stimmt), jeder andere Status ist unbrauchbar.                     |
| `readAnswer` (privat)  | Macht aus dem JSON eine `Answer`. Ohne Objekt, ohne Text oder mit leerem Text: `undefined` (unbrauchbar).                                                                                                                                                                          |
| `readGimmick` (privat) | Nimmt das Feld `gimmick` nur, wenn es ein Objekt mit Textfeld `type` ist; sonst bleibt es weg und die Antwort besteht nur aus dem Text.                                                                                                                                            |
| `isRecord` (privat)    | Ist der Wert ein Objekt (und nicht `null`)?                                                                                                                                                                                                                                        |
