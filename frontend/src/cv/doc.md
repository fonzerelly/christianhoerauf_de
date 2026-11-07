# cv

Der Adapter für `/lebenslauf` (Plan Schritt 12.8, Q23). Kennt nur die Domäne (Architekturtest
`cv-uses-domain-only`).

| Name                        | Was sie konkret tut                                                                                                                                                                                                                                                         |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `readCv(json)`              | Übersetzt das JSON (`backend/schema/lebenslauf.schema.json`, deutsche Schlüssel) in `Cv`: `abschnitte`/`eintraege`/`zeit`/`titel`/`organisation`/`stichpunkte`. Fehlende Stichpunkte: leer. Wirft mit `/lebenslauf: …`, wenn Abschnitte, Namen, Einträge oder Titel fehlen. |
| `HttpCvSource.load()`       | `GET <url>?variante=<Nummer>` (ohne Variante ohne Parameter), bei Erfolg `readCv`; Fehlerstatus wirft `/lebenslauf: Status <n>`.                                                                                                                                            |
| `cvUrlOf(answerUrl, isDev)` | Die Adresse: `/lebenslauf` beim Backend der Antworten; im Dev-Server die eigene Herkunft (Vite leitet weiter, `vite.config.ts`); ohne Backend `undefined`.                                                                                                                  |

Testdaten: `tests/fixtures/lebenslauf.json`, ein ausgedachter Lebenslauf im Format des Backends.
