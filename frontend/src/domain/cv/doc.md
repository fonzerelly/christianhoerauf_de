# domain/cv

Der Lebenslauf von `/lebenslauf`, gelesen für die Zeitleiste (Plan Schritt 12.8, ADR 0007).
Vorlage: `prototyp/12-klappleiste/zeitleiste.js`. Die Tests arbeiten mit ausgedachten Daten; der
echte Lebenslauf steht nur im Backend (das Repo ist öffentlich).

| Datei          | Was sie tut                                                               |
| -------------- | ------------------------------------------------------------------------- |
| `time-span.ts` | `yearOf`, `timeSpanOf`: Zeitpunkte und Zeiträume als Jahre.               |
| `stations.ts`  | `Cv`, `Station`, `stationsOf` und die Beschriftungen und Einstiegsfragen. |

## time-span.ts

| Name                        | Was sie konkret tut                                                                                                                                                              |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `yearOf(part, edge, today)` | „10/2020“ → 2020 + 9/12 als Beginn (`start`), 2020 + 10/12 als Ende (`end`); „2014“ → 2014 bzw. 2014,5 (Ende ohne Monat: Jahresmitte); „heute“ → `today`. Unlesbar: `undefined`. |
| `timeSpanOf(text, today)`   | „2011 – 2014“ (Gedanken- oder Bindestrich) → `{from, to}`; ein einzelner Zeitpunkt ist Beginn und Ende. Ist eine Seite unlesbar: `undefined`.                                    |

`today` ist das heutige Datum als Jahr mit Nachkommastellen; die Domäne kennt keine Uhr, es kommt
von außen.

## stations.ts

| Name                       | Was sie konkret tut                                                                                                                                                                                                                                                                                                                                                                                                                            |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Cv`, `CvEntry`            | Der Lebenslauf in der Domäne: Abschnitte (`name`: „beruf“, „studium“ …) mit Einträgen (`time?`, `title`, `organization?`, `bulletPoints`).                                                                                                                                                                                                                                                                                                     |
| `stationsOf(cv, today)`    | Nimmt die Einträge mit lesbarem Zeitraum, sortiert nach Beginn und nummeriert sie (`id`). Eine klein geschriebene Organisation („ehrenamtlich“) zählt nicht als Name. Auf die Linie (`mainTrack`): was vor dem ersten Beruf endete, dann der Beruf; der Rest wird Engagement. Ohne Beruf beginnt alles beim ersten Eintrag, ohne Einträge bei `today`.                                                                                         |
| `shortName(station)`       | Organisation ohne Rechtsform („Muster Software AG“ → „Muster“, „TeamBank AG“ → „TeamBank“), sonst der Titel.                                                                                                                                                                                                                                                                                                                                   |
| `yearLabel(station)`       | Das Jahr des Beginns als Text.                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `engagementLabel(station)` | Titel bis zum ersten Komma, mit Organisation „Titel · Organisation“.                                                                                                                                                                                                                                                                                                                                                                           |
| `entryQuestions(station)`  | Die Einstiegsfragen (Q21): „Was hat Chris bei <Organisation> gemacht?“ (ohne Organisation „in der Zeit „<Titel>““), dann je Stichpunkt „Erzähl mir mehr über Chris und „<Stichpunkt>“ bei <Organisation>.“ bzw. „… (<Titel>).“ „Chris“ steht in jeder Frage, damit der Bot sie als Frage zum Werdegang einordnet (ohne hielt er etwa „Abschluss Diplom-Ingenieur“ für allgemeines Wissen). Die Beschriftung ist die Frage bzw. der Stichpunkt. |
