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
| `Intent` | Die 17 Absichten aus `docs/backend/ABSICHTEN.md`. Der Wert ist das Kürzel `gruppe/absicht`, z. B. `general/knowledge`, `christian/career`, `jailbreak`. |
| `Intent.group` | Die erste Stufe, also der Teil vor dem `/`: `general`, `christian`, `sensitive`, `jailbreak` oder `gibberish`. |

## reaction.py

| Name | Was es konkret tut |
|---|---|
| `ReactionKind` | Was der Bot auf eine Absicht tut: `GENERAL_ANSWER` (Modell antwortet mit dem allgemeinen Prompt), `TASK_ANSWER` (Modell antwortet mit dem Auftrags-Prompt), `KNOWLEDGE_BASE_ANSWER` (Modell antwortet nur aus den freigegebenen Texten der Wissensbasis), `FIXED_TEXT`, `GIMMICK` (fester Text plus ein `gimmick`-Objekt, siehe `gimmick_for`). |
| `reaction_for(intent)` | Wissen und Smalltalk → `GENERAL_ANSWER`, Auftrag → `TASK_ANSWER`, Laufbahn (`christian/career`) → `KNOWLEDGE_BASE_ANSWER`, Flirt, Bild und sexuell → `GIMMICK`, alles andere → `FIXED_TEXT`. Eine neue Absicht bekommt also einen festen Text, bis sie bewusst eingetragen wird. |

## language.py

| Name | Was es konkret tut |
|---|---|
| `Language` | `"de"` oder `"en"`. |
| `guess_language(text)` | Rät die Sprache der Frage: enthält sie ä, ö, ü oder ß, ist sie deutsch; sonst zählt sie deutsche und englische Füllwörter (`der`, `ist`, `the`, `what` ...). Mehr englische als deutsche: Englisch, sonst (auch bei Gleichstand und leerem Text) Deutsch. |

## fixed_answers.py

| Name | Was es konkret tut |
|---|---|
| `FixedAnswerKind` | Feste Antworten, die nicht von der Absicht abhängen: nicht erreichbar, Tagesgrenze, Besuchergrenze, ungültige Anfrage. |
| `fixed_answer(kind, language)` | Liefert die feste `Answer` (nur Text, kein Gimmick) für die Art und die Sprache aus einer Tabelle. |
| `intent_answer(intent, language)` | Liefert den festen Text einer Absicht (Tabelle „Feste Texte“ in `ABSICHTEN.md`), deutsch oder englisch, ohne Gimmick. Für Wissen, Smalltalk und Auftrag gibt es keinen: `ValueError`. |

## cost_protection.py

| Name | Was es konkret tut |
|---|---|
| `DAILY_LIMIT`, `VISITOR_LIMIT` | 2.000 Fragen pro Tag insgesamt, 10 allgemeine Fragen pro Besucher und Tag. |
| `daily_limit_reached(count)` | Wahr, wenn die Zahl der heutigen Fragen (inklusive der aktuellen) über 2.000 liegt. |
| `visitor_limit_reached(count)` | Wahr, wenn die Zahl der heutigen allgemeinen Fragen des Besuchers (inklusive der aktuellen) über 10 liegt. |
| `normalize_question(question)` | Kleinschreibung und einfache Leerzeichen (auch Tabs und Zeilenumbrüche werden zu einem Leerzeichen). |
| `daily_counter_key(day)` | Schlüssel des Tageszählers, z. B. `daily:2026-10-22`. |
| `visitor_counter_key(tag, day)` | Schlüssel des Besucherzählers, z. B. `visitor:2026-10-22:ab12...`. |
| `cache_key(question, day, version)` | Schlüssel des Zwischenspeichers: Kennung des Ausrollens, Tag und SHA-256 der aufbereiteten Frage. Die Frage selbst steht nicht im Schlüssel. Nach einem neuen Ausrollen (andere `version`) passt kein alter Eintrag mehr. |
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
| `gimmick_for(intent)` | Das `gimmick`-Objekt zur Absicht: Flirt → `{"type": "heart"}`, Bild (`christian/picture`) → `{"type": "photo"}`, sexuell → `{"type": "face_with_hand_over_mouth"}`, alle anderen → `None`. Liefert jedes Mal eine eigene Kopie, damit niemand die Tabelle verändert. |
| `GimmickRegistry.descriptions()` | Die Beschreibungen aller angemeldeten Gimmicks, daraus entsteht später die Auswahl der Absichten. |

## cv.py

Die Stationen der Wissensbasis als Einträge des Lebenslaufs (für PDF und Webseite, siehe
`docs/bewerbung/IMPLEMENTATION_PLAN.md`). Kennt keine Privaten Angaben.

| Name | Was es konkret tut |
|---|---|
| `SECTIONS` | Die Abschnitte in Lebenslauf-Reihenfolge: beruf, lehre, studium, praktikum, zivildienst, schule. |
| `YearMonth` | Ein Zeitpunkt aus `von`/`bis`: Jahr, Monat optional. Sortiert nach Jahr, ein bloßes Jahr vor allen Monaten desselben Jahres. |
| `YearMonth.parse(value)` | Liest `"2014-11"`, `"2014"` oder die Zahl `2014`; alles andere (`"11/2014"`, `"etwa 2017"`, Monat 13) → `ValueError`. |
| `CvStation` | Die Lebenslauf-Felder einer Station: Name, Abschnitt, Beginn, Ende (`None` = läuft noch), Titel (fett), Organisation (grau, darf leer sein), Stichpunkte. |
| `CvEntry` | Eine Station samt fertigem Zeitraum-Text, so wie sie im Lebenslauf steht. |
| `InvalidStationError` | Meldung mit Station und Feld, z. B. „teambank: Feld von erwartet JJJJ-MM oder JJJJ, gefunden: '11/2014'“. |
| `_Header(name, header)` | Hilfe zum Lesen eines Kopfteils: `field(key)` (fehlt → Fehler), `fail(key, expected)` (baut die Meldung), `text(key, may_be_empty=False)` (ein nicht leerer Text), `year_month(key)` (`YearMonth.parse`), `end()` (`bis`: Zeitpunkt oder `heute` → `None`). Jeder Fehler ist ein `InvalidStationError` mit Dateiname und Feld. |
| `parse_station(name, header)` | Liest aus dem Kopfteil `titel`, `organisation` (darf leer sein), `abschnitt`, `von`, `bis` (`heute` = läuft noch), `stichpunkte`; fehlt eines oder passt es nicht → `InvalidStationError`. |
| `_period(start, end, with_months)` | Der Zeitraum-Text aus Beginn und Ende: mit Monaten „11/2014 – 09/2020“ (wo kein Monat bekannt ist, nur das Jahr), sonst „2011 – 2014“; laufend „… – heute“; fallen Beginn und Ende auf dasselbe, nur einmal („2014“). |
| `period_label(station, with_months)` | `_period` für eine Station. |
| `CvProject` | Ein Projekt unter „Projekte und Vorträge“: Name, Titel, Beginn, Ende (`None` = läuft noch), Text (die `zusammenfassung`), Link (`None`, wenn es keinen gibt). |
| `parse_project(name, header)` | Liest `titel`, `von`, `bis`, `zusammenfassung` (Pflicht) und `link` (darf fehlen) → `CvProject`; sonst `InvalidStationError`. Ob das Projekt im Lebenslauf steht, entscheidet `varianten.yaml`. |
| `cv_projects(projects)` | Die Reihenfolge im Lebenslauf (dort ohne Zeitangabe): spätestes Endjahr zuerst (laufende ganz vorn), bei gleichem Jahr nach Name. |
| `cv_sections(stations)` | Ordnet die Stationen nach `SECTIONS` (leere Abschnitte fallen weg), darin die neueste zuerst. Datumsregel: Die zwei neuesten Stationen der Berufserfahrung zeigen Monate, alle anderen nur Jahre. |

## personal_link.py

Der persönliche Link in den Unterlagen einer Bewerbung. Die Beispiele in
`schema/personal-link.examples.json` gelten für Python und Frontend gleichermaßen.

| Name | Was es konkret tut |
|---|---|
| `SITE` | `https://christianhoerauf.de/` |
| `fnv1a(text)` | FNV-1a, 32 Bit, über die Unicode-Zeichen; rechnet genau wie `seedFromText` im Briefkopf-Streifen. |
| `checksum(number, name)` | Die ersten 4 Hex-Ziffern von `fnv1a("Nummer|Name")`, z. B. `4711`, „Frau Erika Muster“ → `e9bd`. |
| `personal_fragment(number, name)` | base64url ohne `=` von „Nummer|Name|Prüfsumme“ (UTF-8). Ein `|` im Namen → `ValueError`. |
| `personal_link(number, name)` | `SITE` + `#` + Fragment. |

## cv_variant.py

Varianten des Lebenslaufs. In `lebenslauf/varianten.yaml` stehen nur Schalter; jede Kombination
ist eine Variante. Eine neue Bewerbung braucht so nie ein neu ausgerolltes Backend.

| Name | Was es konkret tut |
|---|---|
| `Switch` | Ein Schalter: Name (etwa `ehrenamt`) und was er weglässt (Abschnitte, Stationen, Projekte). |
| `Variant` | Name (etwa `ohne_insert_effect_und_ehrenamt`), Nummer für den persönlichen Link, alles, was sie weglässt. |
| `InvalidVariantError` | Meldung mit Schalter und Problem. |
| `parse_switches(data, known_names)` | Liest `schalter:` aus der schon geladenen YAML-Datei in Dateireihenfolge; `None` → keine Schalter. Name nur aus Kleinbuchstaben, Ziffern, `_`, ohne `und` als Teil; Liste nicht leer; jeder Eintrag ein Abschnitt oder in `known_names`. |
| `parse_project_list(data, known_projects)` | Liest `projekte:` aus der schon geladenen Variantendatei: die Projekte des ganzen Lebenslaufs, in Dateireihenfolge. Fehlt die Liste (oder ist `data` `None`) → keine Projekte. Keine Liste von Namen oder ein Name nicht in `known_projects` → `InvalidVariantError`. |
| `variant_number(name)` | `1000 + FNV-1a(name) mod 9000`: vierstellig, steht nirgends, für denselben Namen immer gleich. |
| `all_variants(switches)` | Alle Kombinationen: erst einzelne Schalter, dann Paare usw., Name `ohne_` + Schalter mit `_und_` in Dateireihenfolge. Ein neuer Schalter ändert Namen und Nummern der alten nicht. Doppelte Nummer → `InvalidVariantError`. |
| `omit(stations, names)` | Lässt jede Station weg, deren Name oder Abschnitt in `names` steht. |
| `variant_by_number(variants, number)` | Die Variante mit dieser Nummer oder `None` (dann der ganze Lebenslauf). |
