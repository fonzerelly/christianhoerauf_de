# domain

Die Fachlogik des Bots, ohne Ein- und Ausgabe: kein AWS, kein HTTP, kein DSPy. Dieser Ordner
importiert nur sich selbst (der Architekturtest `lint-imports` prüft das).

## answer.py

| Name | Was es konkret tut |
|---|---|
| `Answer` | Unveränderliche Antwort des Bots (Vertrag laut ADR system/0003). Felder: `text` (immer) und `gimmick` (ein Dict oder `None`). |
| `Answer.to_dict()` | Liefert die Antwort als Dict, das sich direkt als JSON ausgeben lässt: immer `{"text": ...}`; der Schlüssel `gimmick` kommt nur dazu, wenn ein Gimmick gesetzt ist. |

## intent.py

| Name | Was es konkret tut |
|---|---|
| `Intent` | Die vier Absichten einer Frage: `GENERAL` (allgemeine Frage), `ABOUT_CHRISTIAN` (Frage über Christian), `GIMMICK`, `DISALLOWED` (unzulässig). |

## language.py

| Name | Was es konkret tut |
|---|---|
| `Language` | `"de"` oder `"en"`. |
| `guess_language(text)` | Rät die Sprache der Frage: enthält sie ä, ö, ü oder ß, ist sie deutsch; sonst zählt sie deutsche und englische Füllwörter (`der`, `ist`, `the`, `what` ...). Mehr englische als deutsche: Englisch, sonst (auch bei Gleichstand und leerem Text) Deutsch. |

## fixed_answers.py

| Name | Was es konkret tut |
|---|---|
| `FixedAnswerKind` | Wofür es eine feste Antwort gibt: Frage über Christian, unzulässig, nicht erreichbar, Tagesgrenze, Besuchergrenze, ungültige Anfrage. |
| `fixed_answer(kind, language)` | Liefert die feste `Answer` (nur Text, kein Gimmick) für die Art und die Sprache aus einer Tabelle. Die Antwort auf Fragen über Christian lautet „Darüber lerne ich gerade noch.“ |

## cost_protection.py

| Name | Was es konkret tut |
|---|---|
| `DAILY_LIMIT`, `VISITOR_LIMIT` | 2.000 Fragen pro Tag insgesamt, 10 allgemeine Fragen pro Besucher und Tag. |
| `daily_limit_reached(count)` | Wahr, wenn die Zahl der heutigen Fragen (inklusive der aktuellen) über 2.000 liegt. |
| `visitor_limit_reached(count)` | Wahr, wenn die Zahl der heutigen allgemeinen Fragen des Besuchers (inklusive der aktuellen) über 10 liegt. |
| `normalize_question(question)` | Kleinschreibung und einfache Leerzeichen (auch Tabs und Zeilenumbrüche werden zu einem Leerzeichen). |
| `daily_counter_key(day)` | Schlüssel des Tageszählers, z. B. `daily:2026-10-22`. |
| `visitor_counter_key(tag, day)` | Schlüssel des Besucherzählers, z. B. `visitor:2026-10-22:ab12...`. |
| `cache_key(question, day)` | Schlüssel des Zwischenspeichers: Tag plus SHA-256 der aufbereiteten Frage. Die Frage selbst steht nicht im Schlüssel. |
| `visitor_tag(ip, secret, day)` | 16 Hexzeichen als Kürzel des Besuchers. Erst wird aus Geheimnis und Datum das Tagessalz berechnet (HMAC-SHA-256, nie gespeichert), dann die IP damit gehasht. Gleiche IP am selben Tag ergibt gleiches Kürzel, anderer Tag oder andere IP ein anderes. |

## reply_check.py

| Name | Was es konkret tut |
|---|---|
| `MAX_LENGTH` | 200 Zeichen. |
| `check_reply(text)` | Entfernt Emojis, macht aus Leerraum einfache Leerzeichen. Ist der Text länger als 200 Zeichen, kürzt sie ihn. |
| `_shorten(candidate)` | Kürzt an der letzten Satzgrenze (`.`, `!`, `?` vor Leerzeichen oder Ende); gibt es keine, am letzten Wort und hängt einen Punkt an; gibt es auch kein Leerzeichen, hart bei 200 Zeichen. |

## gimmick.py

| Name | Was es konkret tut |
|---|---|
| `Gimmick` | Schnittstelle eines Gimmicks: `name`, `description` (beschreibt die Absicht) und `answer(question)`, das eine `Answer` liefert. |
| `GimmickRegistry.register(gimmick)` | Meldet ein Gimmick an. In Stufe 1 ruft niemand das auf. |
| `GimmickRegistry.gimmicks` | Die angemeldeten Gimmicks als Tupel; anfangs leer. |
| `GimmickRegistry.descriptions()` | Die Beschreibungen aller angemeldeten Gimmicks, daraus entsteht später die Auswahl der Absichten. |
