# answering

Woher die Antworten kommen. Heute aus der statischen Datei `public/content.json`; später antwortet ein
Sprachmodell hinter einer Lambda-Funktion (ADR 0003). Getauscht wird nur in `main.ts`.

| Datei                             | Was sie tut                                                         |
| --------------------------------- | ------------------------------------------------------------------- |
| `answer.ts`                       | `Answer` (Text, optional `Gimmick`) und `Gimmick`.                  |
| `answer-source.ts`                | Port `AnswerSource`: `answer(question): Promise<Answer>`.           |
| `content.ts`                      | `Content`, `parseContent`: prüft den Inhalt von `content.json`.     |
| `keyword-matcher.ts`              | `KeywordMatcher`: wählt zu einer Frage die Antwort aus der Tabelle. |
| `fetch-json.ts`                   | `fetchJson`: holt eine Adresse und liefert den JSON-Inhalt.         |
| `static-content-answer-source.ts` | `StaticContentAnswerSource`: die heutige Antwortquelle.             |

## AnswerSource

`answer(question)` liefert die Antwort auf die Frage. Eine **leere Frage liefert die Begrüßung**. Das
Versprechen wird immer eingelöst: Kann die Quelle nicht antworten, liefert sie eine Antwort, die das sagt.
Ein `gimmick` in der Antwort zeigt das Frontend noch nicht; es schreibt immer den Text.

## parseContent

`parseContent(json)` macht aus dem rohen JSON einen `Content` (`greeting`, `unknownAnswer`, `answers`
mit je `keywords` und `answer`). Fehlt etwas oder hat es die falsche Form, wirft sie einen Fehler, der
das Feld nennt (`content.json: answers[2].keywords muss eine Liste von Texten sein`). Unbekannte Felder
werden ignoriert.

## KeywordMatcher

| Methode                        | Was sie konkret tut                                                                                                                                                                                                                 |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `constructor(entries)`         | Nimmt die Tabelle.                                                                                                                                                                                                                  |
| `find(question)`               | Die Antwort des ersten Eintrags, von dem ein Stichwort als ganzes Wort (oder ganze Wortfolge) in der Frage vorkommt. Groß- und Kleinschreibung und Satzzeichen sind egal; "hi" passt nicht auf "Schiff". Passt nichts: `undefined`. |
| `simplifyForMatching` (privat) | Kleinbuchstaben, alles außer Buchstaben und Ziffern wird Leerzeichen, vorn und hinten genau eins. Aus "Wer bist du?" wird " wer bist du ".                                                                                          |

## fetchJson

`fetchJson(url, fetchFunction)`: Holt die Adresse. Ist die Antwort nicht erfolgreich, wirft sie
`<url>: Status <n>`; sonst liefert sie den JSON-Inhalt.

## StaticContentAnswerSource

| Methode                    | Was sie konkret tut                                                                                                                                                                             |
| -------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `constructor(loadContent)` | Nimmt eine Funktion, die den rohen JSON-Inhalt liefert (in `main.ts`: `fetchJson("/content.json", fetch)`).                                                                                     |
| `answer(question)`         | Leere Frage: Begrüßung. Sonst die Antwort des passenden Stichworts, sonst die Standardantwort. Schlägt das Laden oder Prüfen fehl: `UNAVAILABLE_ANSWER` („Das klappt gerade nicht …“).          |
| `loadOnce` (privat)        | Lädt und prüft den Inhalt beim ersten Mal und behält das Ergebnis (auch bei gleichzeitigen Fragen nur ein Aufruf). Bei einem Fehler wird nichts behalten: die nächste Frage versucht es erneut. |
| `textFor` (privat)         | Wählt den Text für Frage und Inhalt.                                                                                                                                                            |
