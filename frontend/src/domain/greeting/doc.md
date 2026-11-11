# domain/greeting

Der persönliche Link aus den Unterlagen einer Bewerbung und die Begrüßung, die daraus entsteht
(Plan Schritt 12.2, ADR 0007). Vorlage: `prototyp/12-klappleiste/inhalte.js`.

| Datei              | Was sie tut                                                    |
| ------------------ | -------------------------------------------------------------- |
| `personal-link.ts` | `PersonalLink`, `readPersonalLink`: liest den Teil hinter `#`. |
| `greeting.ts`      | Stichwort und Text der Begrüßung zu einem `PersonalLink`.      |

## personal-link.ts

Hinter `#` steht base64url (ohne `=`) von „Variantennummer|Ansprechpartner|Prüfsumme“, gebaut von
`backend/src/bot/domain/personal_link.py`. Die Tests lesen dieselben Beispiele wie das Backend
(`backend/schema/personal-link.examples.json`). Benutzt `atob` und `TextDecoder`; beide gibt es im
Browser und in Node, ein DOM braucht es nicht.

| Name                         | Was sie konkret tut                                                              |
| ---------------------------- | -------------------------------------------------------------------------------- |
| `PersonalLink`               | `{kind: "none"}`, `{kind: "broken"}` oder `{kind: "valid", variant, name}`.      |
| `fnv1a(text)`                | FNV-1a mit 32 Bit über die Codepoints (wie Python, nicht über UTF-16-Einheiten). |
| `checksumOf(variant, name)`  | Die ersten 4 Hex-Ziffern von `fnv1a("Nummer                                      | Name")`.                                                                         |
| `decodeBase64Url` (privat)   | base64url → Text in UTF-8; `undefined` bei ungültigem base64 oder UTF-8.         |
| `readPersonalLink(fragment)` | Leer (auch nur `#`): `none`. Sonst dekodieren und an `                           | `teilen: vorn eine Zahl, hinten die Prüfsumme, dazwischen der Name (darf selbst` | `enthalten). Stimmt etwas nicht oder passt die Prüfsumme nicht:`broken`. |

## greeting.ts

| Name                             | Was sie konkret tut                                                                                                                                                                                                                           |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `addressAndSurname(name)`        | „Frau Erika Muster“ → „Frau Muster“ (Anrede Frau/Herr, das letzte Wort als Nachname). Ohne Anrede, oder nur zwei Wörter: der Name mit einfachen Leerzeichen.                                                                                  |
| `greetingKeyword(link, options)` | Das Stichwort: mit gültigem Link Anrede und Nachname, mit `withHello` (Desktop) „Hallo“ davor in eigener Zeile (`\n` = erzwungener Umbruch). Sonst, oder wenn `canWrite` nein sagt: „Hallo“.                                                  |
| `greetingParagraphs(link)`       | Der Text als Absätze: „Hallo <voller Name>,“ (gültiger Link) bzw. „Hallo,“ (kein oder kaputter Link), dann wer antwortet (ChrisBot) und wie man fragt (frei oder über den Werdegang). Ohne Namen sonst derselbe Text. Wortlaut von Christian. |
