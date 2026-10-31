# Prototyp 8 „Chatbot-Galerie“ – 50 Alternativen zum Labyrinth

Wegwerf-Prototypen, entstanden am 2026-10-31. Anlass: Das Labyrinth wirkt auf Besucher
ohne Technikhintergrund (also auch auf Personalabteilungen) eher langatmig als originell.
Das Labyrinth soll bleiben; daneben braucht es ein oder zwei Oberflächen, die sofort
verständlich sind. Diese Galerie ist die Auswahl zum Durchsprechen.

**Öffnen:** `xdg-open prototyp/08-chatbot-galerie/index.html` – Übersicht mit Vorschaubildern,
Filter nach Abteilung, Sortierung nach HR- oder Nerd-Wertung. Jeder Prototyp ist eine einzelne
HTML-Datei und läuft per Doppelklick (kein Server, kein Build).

**Inhalt:** Alle 50 nutzen dieselben Platzhalter: eine Begrüßung, drei Fragen mit
Lorem-Ipsum-Antworten („Wer bist du?“, „Was machst du beruflich?“, „Erzähl mir was Langes“)
und eine „weiß ich nicht“-Antwort. Es geht nur ums Aussehen und die Bedienung.

## Empfehlung zum Durchsprechen

Ziel: Labyrinth behalten, ein bis zwei Oberflächen daneben, die bei Personalern nicht
anecken und trotzdem nach Chris aussehen.

1. **Standard für alle: 06 „Lebenslauf, der antwortet“.** Personaler wollen ohnehin einen
   Lebenslauf sehen; hier ist er sofort da, und der Bot ist ein Zusatz, kein Hindernis. Dass
   die Antwort die passende Station im Lebenslauf markiert, ist unaufdringlich clever.
   Alternative mit gleicher Wirkung: 03 „Profilseite mit Chat“.
2. **Das Labyrinth als Markenzeichen hineinretten: 18 „Labyrinth als Ladeanzeige“.** Logo und
   Denk-Kringel sind ein Mini-Labyrinth mit Lichtpunkt. Das verbindet die neue mit der
   alten Seite, ohne jemanden warten zu lassen. Lässt sich mit 06 oder 03 kombinieren.
3. **Der Weg ins Labyrinth: ein Schalter statt einer Weiche.** 17 „Zwei Türen“ zeigt die Idee,
   kostet Personaler aber einen Klick und eine Entscheidung. Besser: Start in der klaren
   Fassung, oben rechts ein Schalter „Labyrinth-Modus“. Wer neugierig ist, findet ihn.
4. **Das Labyrinth selbst entschärfen: 16 „Labyrinth, sofort lesbar“.** Falls die Kritik eher
   die Wartezeit als das Labyrinth betrifft: Text sofort zeigen, die Leuchtspur nur als
   Dekoration hinterher. Damit hätte man die alte Seite in einer zweiten, schnellen Fassung.
5. **Für Technikmenschen als verstecktes Extra:** 21 „Bash-Shell“ oder 28 „API-Dokumentation“
   – etwa über die Taste `/` oder einen Link „für Entwickler“. Kostet Personaler nichts und
   sorgt im Fachgespräch für Gesprächsstoff.

Die Abteilungen „Kein Ponyhof“ und „What the Brainfuck“ sind eher Steinbruch für Ideen und
Ostereier als Kandidaten für die Startseite.

## Die 50 Designideen

HR und Nerd: grobe Einschätzung von 1 bis 5, wie gut der Prototyp bei Personalern bzw. bei
Technikmenschen ankommt. Bauchgefühl, keine Messung.

### Seriös & HR-tauglich

| Nr | Prototyp | HR | Nerd | Designidee |
|---|---|---|---|---|
| 01 | [Wie ChatGPT](01-wie-chatgpt/index.html) | 5 | 2 | Dunkle Seitenleiste mit Verlauf, Antworten werden wortweise gestreamt. Jeder kennt die Bedienung, niemand muss nachdenken. |
| 02 | [Messenger](02-messenger/index.html) | 5 | 1 | Handy-Chat mit Häkchen und „schreibt …“. Lange Antworten kommen als mehrere kurze Nachrichten, wie bei einem Menschen. |
| 03 | [Profilseite mit Chat](03-profil-mit-chat/index.html) | 5 | 2 | Klassische Visitenkarte links (Name, Rolle, Stichworte, Lebenslauf-Knopf), Chatfenster rechts. Wer nicht chatten will, hat trotzdem alles. |
| 04 | [Nur ein Suchfeld](04-ein-suchfeld/index.html) | 4 | 2 | Suchmaschinen-Startseite mit „Auf gut Glück!“. Antwort als hervorgehobenes Suchergebnis, darunter „Ähnliche Fragen“. Farben des Logos müssten eigene werden. |
| 05 | [Magazin-Interview](05-magazin/index.html) | 4 | 2 | Jede Frage wird ein Interview-Abschnitt in Serifenschrift, mit Initiale und herausgestelltem Zitat. Das Gespräch liest sich am Ende wie ein Porträt. |
| 06 | [Lebenslauf, der antwortet](06-lebenslauf-der-antwortet/index.html) | 5 | 3 | Ein ganz normaler Lebenslauf; die Chatleiste unten beantwortet Fragen und markiert die passenden Stationen im Dokument. |
| 07 | [Bento-Kacheln](07-bento-kacheln/index.html) | 4 | 3 | Modernes Kachelraster (Name, Zahlen, Werkzeuge, Ort). Eine große Kachel ist der Chat, drei Kacheln sind anklickbare Fragen. |
| 08 | [FAQ-Akkordeon](08-faq-akkordeon/index.html) | 5 | 1 | Häufige Fragen zum Aufklappen; eigene Fragen werden als neuer Eintrag angehängt. Maximal unaufgeregt. |
| 09 | [Porträt mit Sprechblase](09-portraet-sprechblase/index.html) | 4 | 2 | Eine Figur (später: freigestelltes Foto) antwortet in einer Comic-Sprechblase, der Mund bewegt sich beim Tippen. |
| 10 | [Schweizer Stil](10-schweizer-stil/index.html) | 4 | 3 | Strenges Raster, riesige Groteskschrift, ein roter Balken. Die Frage ist die Überschrift, die Antwort der Fließtext. Wirkt wie ein Designbüro. |
| 11 | [Befehlspalette](11-befehlspalette/index.html) | 3 | 4 | Strg+K öffnet eine Palette wie in modernen Editoren: Vorschläge filtern beim Tippen, Pfeiltasten wählen, Enter fragt. |
| 12 | [Postfach](12-postfach/index.html) | 4 | 2 | Fragen schreibt man als Mail, Antworten landen als ungelesene Nachricht im Posteingang. Ordner „Junk (Recruiter-Spam)“ inklusive. |
| 13 | [Notizbuch](13-notizbuch/index.html) | 3 | 1 | Kariertes Ringbuch, Frage in Rot, Antwort in Blau, mit unregelmäßigem Handschrift-Tempo geschrieben. |
| 14 | [Brief von der Schreibmaschine](14-schreibmaschinen-brief/index.html) | 3 | 2 | Die Antwort wird als förmlicher Brief getippt, mit Anschlaggeräusch aus der Web Audio API und rotem Wagen-Cursor. |

### Brücken zum Labyrinth

| Nr | Prototyp | HR | Nerd | Designidee |
|---|---|---|---|---|
| 15 | [Labyrinth im Hintergrund](15-labyrinth-im-hintergrund/index.html) | 4 | 4 | Normaler Chat im Vordergrund; dahinter läuft der Lichtpunkt endlos durchs dunkle Labyrinth. Beim Nachdenken wird er schneller. Marke bleibt, Wartezeit weg. |
| 16 | [Labyrinth, sofort lesbar](16-labyrinth-sofort-lesbar/index.html) | 4 | 4 | Die Antwort steht sofort als Text über dem Labyrinth; der Lichtpunkt zeichnet seine Spur nur noch als Dekoration hinterher (2 s). Kompromiss für genau die Kritik. |
| 17 | [Zwei Türen](17-zwei-tueren/index.html) | 4 | 4 | Startseite als Weiche: links „Klassisch“ (normaler Chat), rechts „Das Labyrinth“ (die bestehende Seite). Jeder wählt selbst. |
| 18 | [Labyrinth als Ladeanzeige](18-labyrinth-als-ladeanzeige/index.html) | 5 | 3 | Schlichter heller Chat; das Labyrinth schrumpft zum Logo und zum Avatar, durch den ein roter Punkt läuft, solange der Bot denkt. |
| 19 | [Grüner Monitor als Chat](19-gruener-monitor-als-chat/index.html) | 3 | 5 | Der Look von Prototyp 5/6 (Röhrenmonitor, Zeilenraster, Bildstörung), aber die Antwort ist normaler Text. Stimmung behalten, Lesezwang weg. |
| 20 | [Endlospapier](20-endlospapier/index.html) | 3 | 4 | Antworten werden zeilenweise auf grün-weißes Endlospapier gedruckt, mit Nadeldrucker-Geräusch. Passt zum Drucker aus Prototyp 7. |

### Für Technikmenschen

| Nr | Prototyp | HR | Nerd | Designidee |
|---|---|---|---|---|
| 21 | [Bash-Shell](21-bash-shell/index.html) | 2 | 5 | Terminal mit ls, cat, whoami, sudo und Verlauf per Pfeiltaste. Alles, was kein Befehl ist, geht als Frage an den Bot – Nicht-Nerds bleiben nicht hängen. |
| 22 | [DOS-Prompt](22-dos-prompt/index.html) | 2 | 5 | Bootvorgang mit Speichertest, dann C:\CHRIS>. DIR, TYPE, VER, CLS gehen; der Rest startet CHRISBOT.EXE. |
| 23 | [Textadventure](23-textadventure/index.html) | 2 | 5 | Drei Räume, in jedem liegt ein Gegenstand mit einer Frage. Punkte fürs Lesen. „frage chris …“ geht überall. |
| 24 | [IRC-Kanal](24-irc-kanal/index.html) | 2 | 4 | 90er-Chatclient mit Nickliste, /nick, /me und !fragen. ChrisBot antwortet im Kanal, lurker42 sagt manchmal „lol“. |
| 25 | [Retro-Desktop](25-retro-desktop/index.html) | 3 | 4 | Desktop im Stil der 90er: Symbole, verschiebbare Fenster, Taskleiste, Uhr. ChrisBot.exe ist ein Programmfenster; im Papierkorb liegt das Labyrinth (nicht gelöscht). |
| 26 | [Videotext](26-videotext/index.html) | 3 | 4 | Videotext-Tafel 100 mit Farbtasten. Seiten 101–103 sind die Fragen, freie Fragen landen auf 888. Der Seitenzähler läuft vorher hoch. |
| 27 | [8-Bit-Heimcomputer](27-heimcomputer-basic/index.html) | 2 | 5 | Blauer BASIC-Bildschirm mit READY. LIST zeigt das Bot-Programm, RUN startet es, ESC ist BREAK, sonst ?SYNTAX ERROR. |
| 28 | [API-Dokumentation](28-api-dokumentation/index.html) | 2 | 5 | Die Seite ist eine interaktive API-Doku: POST /ask mit „Execute“-Knopf, echtes JSON im Vertragsformat. DELETE /labyrinth gibt 405. |
| 29 | [git log](29-git-log/index.html) | 2 | 5 | Fragen sind Commits des Besuchers, Antworten Commits von ChrisBot, als Graph mit Hash und HEAD-Markierung. |
| 30 | [Nur JSON](30-nur-json/index.html) | 1 | 4 | Die ganze Seite ist ein rohes JSON-Dokument. Man tippt direkt in den Wert von "question". |
| 31 | [Code-Editor](31-code-editor/index.html) | 2 | 5 | Editor-Oberfläche; Fragen schreibt man als Kommentar, der „Copilot“ ergänzt eine Funktion, die die Antwort als String zurückgibt. |
| 32 | [Morsecode](32-morsecode/index.html) | 2 | 4 | Antwort blinkt und piept als Morsecode; Klartext läuft zum Mitlesen (Schalter „für HR“). Tempo einstellbar. |

### Verspielt

| Nr | Prototyp | HR | Nerd | Designidee |
|---|---|---|---|---|
| 33 | [Zettel am Kühlschrank](33-kuehlschrank-zettel/index.html) | 3 | 2 | Fragen und Antworten werden bunte Haftzettel mit Magneten, schief und mit der Maus verschiebbar. |
| 34 | [Das Orakel](34-orakel/index.html) | 2 | 2 | Kristallkugel im Sternenhimmel; sie wabert 2 s, dann steigt die Antwort aus dem Nebel. |
| 35 | [Glückskeks](35-glueckskeks/index.html) | 3 | 2 | Keks anklicken, er bricht auf, drin steckt die Antwort samt Glückszahlen. |
| 36 | [Telefon-Hotline](36-hotline/index.html) | 3 | 3 | Tastentelefon mit Sprachmenü: 1–3 sind Fragen, 4 freies Anliegen, 0 Warteschleife mit Gedudel. |
| 37 | [Comicstrip](37-comic/index.html) | 3 | 2 | Jede Frage und jede Antwort wird ein Comic-Panel mit Sprechblase und „ZACK!“; lange Antworten verteilen sich auf mehrere Panels. |
| 38 | [Karaoke](38-karaoke/index.html) | 3 | 2 | Die Antwort steht sofort blass da und wird Wort für Wort „gesungen“, mit hüpfendem Ball. Lesen geht sofort, Mitsingen ist Bonus. |
| 39 | [Lagerfeuer](39-lagerfeuer/index.html) | 3 | 4 | Pixelszene mit Feuer und zwei Figuren, Textkasten wie in alten Rollenspielen. Beim Erzählen fliegen mehr Funken. |
| 40 | [U-Bahn-Plan](40-ubahn-plan/index.html) | 4 | 3 | Lebenslauf als Liniennetz (Beruf, Ausbildung, Hobbys); Haltestellen anklicken, Antwort erscheint auf der Anzeigetafel. |

### Mein Chatbot ist kein Ponyhof

| Nr | Prototyp | HR | Nerd | Designidee |
|---|---|---|---|---|
| 41 | [Mürrischer Bot](41-muerrischer-bot/index.html) | 2 | 4 | GrummelBot antwortet korrekt, aber mit genervtem Kommentar vorneweg. Laune sinkt mit jeder Frage, steigt mit „danke“/„bitte“. |
| 42 | [Verhörraum](42-verhoerraum/index.html) | 2 | 3 | Rollenumkehr: Der Besucher verhört, ChrisBot ist der Verdächtige. Schwingende Lampe, Protokoll mit Notizen. |
| 43 | [Behördenantrag](43-behoerdenantrag/index.html) | 2 | 3 | Formular CH-A38 mit Pflichtfeldern und Amtsdeutsch; die Antwort kommt als Bescheid mit Aktenzeichen und Stempel. |
| 44 | [Captcha-Hölle](44-captcha-hoelle/index.html) | 1 | 4 | Erst drei Captchas lösen (Ampeln, Programmiersprachen, „Gefühle“). Die dritte ist unlösbar und wird trotzdem durchgewunken: „Nur Menschen zögern.“ |
| 45 | [Wartenummer](45-wartenummer/index.html) | 2 | 3 | Nummer ziehen, Anzeige zählt hoch (ca. 4 s), Gong, Schalter 3 ist offen. Danach beliebig viele Fragen. |

### What the Brainfuck

| Nr | Prototyp | HR | Nerd | Designidee |
|---|---|---|---|---|
| 46 | [What the Brainfuck](46-brainfuck/index.html) | 1 | 5 | Die Antwort wird in Brainfuck übersetzt und live interpretiert, mit Band, Zeiger und markierter Codestelle. Knopf „Ich bin HR, zeig einfach den Text“. |
| 47 | [Hexdump](47-hexdump/index.html) | 1 | 5 | Antworten als xxd-Hexdump; Maus über ein Byte lässt Hex- und Textspalte gemeinsam leuchten. |
| 48 | [Schwerkraft](48-schwerkraft/index.html) | 2 | 4 | Die Antwort steht 2 s, dann fallen alle Buchstaben und stapeln sich. Mit der Maus schubsen, per Knopf wieder zusammensetzen. |
| 49 | [Halt still](49-halt-still/index.html) | 1 | 3 | Die Wörter schwärmen umher, solange sich die Maus bewegt. Erst nach 0,8 s Ruhe ordnen sie sich zum Satz. |
| 50 | [Der Fluchtknopf](50-fluchtknopf/index.html) | 1 | 3 | Das Eingabefeld flieht vor der Maus, nach 7 Versuchen gibt es auf. Per Tab sofort erreichbar. |

## Aufbau

| Pfad | Inhalt |
|---|---|
| `index.html` | Galerie: Übersicht aller 50 mit Vorschaubild, Filter und Sortierung |
| `NN-name/index.html` | Ein Prototyp; HTML, CSS und JavaScript in einer Datei |
| `gemeinsam/antworten.js` | Die Platzhalter-Antworten und der Schein-Bot, den alle Prototypen fragen |
| `gemeinsam/labyrinth-mini.js` | Kleines Zufallslabyrinth für 15–18 (nicht die echte Labyrinth-Schrift) |
| `gemeinsam/katalog.js` | Titel, Abteilung, Idee und Wertung aller 50; Quelle für Galerie und Tabelle oben |
| `vorschau/NN.jpg` | Vorschaubilder für die Galerie (640×400), erzeugt von `werkzeuge/pruefe-alle.js` |
| `werkzeuge/pruefe-alle.js` | Öffnet alle Prototypen in Chrome, stellt eine Frage, meldet JS-Fehler, macht Vorschaubilder |
| `tests/` | Node-Tests mit `assert` (siehe „Tests“) |

Die gemeinsamen Dateien werden mit normalen `<script>`-Tags geladen, nicht als Module: Module
funktionieren über `file://` nicht, und die Prototypen sollen per Doppelklick laufen.

## Funktionen der gemeinsamen Dateien

### `gemeinsam/antworten.js`

| Name | Was es tut |
|---|---|
| `ANTWORTEN` | Begrüßung, „weiß ich nicht“-Antwort und drei Einträge aus Stichwörtern und Antworttext. |
| `VORSCHLAEGE` | Die drei Fragen, die die Prototypen als Knöpfe oder Links anbieten. |
| `vereinfache(text)` | Kleinbuchstaben, Satzzeichen zu Leerzeichen, vorn und hinten ein Leerzeichen. Damit passen Stichwörter nur auf ganze Wörter („hi“ nicht in „Schiff“). |
| `findeAntwort(frage)` | Leere Frage → Begrüßung; sonst die Antwort des ersten Eintrags, dessen Stichwort in der Frage vorkommt; sonst „weiß ich nicht“. Synchron. |
| `frageBot(frage, wartezeitMs)` | Tut so, als frage man das Backend: liefert nach 0,5–1,1 s (oder `wartezeitMs`) ein Versprechen auf `{ text }`, im selben Format wie der echte Bot. Hier würde später der `fetch` an das Lambda stehen. |

### `gemeinsam/labyrinth-mini.js`

| Name | Was es tut |
|---|---|
| `erzeugeLabyrinth(spalten, zeilen)` | Erzeugt ein Zufallslabyrinth nach dem Verfahren „rekursives Zurückgehen“. Jede Zelle merkt sich ihre vier Wände. Liefert zusätzlich `rundgang`: alle Zellen in Ablaufreihenfolge einschließlich der Rückwege aus Sackgassen, so dass ein Lichtpunkt ohne Sprung folgen kann. |
| `zeichneLabyrinth(ctx, labyrinth, groesse, farbe, linienbreite, versatzX, versatzY)` | Zeichnet alle stehenden Wände als einen Linienpfad auf ein Canvas. |

### `gemeinsam/katalog.js`

| Name | Was es tut |
|---|---|
| `ABTEILUNGEN` | Schlüssel und Anzeigename der sechs Abteilungen. |
| `KATALOG` | Ein Eintrag je Prototyp: `ordner`, `titel`, `abteilung`, `hr`, `nerd`, `idee`. |

### `index.html` (Galerie)

| Name | Was es tut |
|---|---|
| `punkte(n)` | n gefüllte und 5−n graue Punkte als HTML für die Wertung. |
| `karte(eintrag)` | Baut die Karte eines Prototyps: Vorschaubild, Nummer, Titel, Idee, Wertungen; Link öffnet in neuem Tab. |
| `zeige()` | Füllt die Seite neu: nach Abteilung gefiltert, bei „nach Nummer“ in Abschnitten je Abteilung, sonst ein Raster nach Wertung sortiert. |

## Funktionen in den Prototypen

Fast alle Prototypen folgen demselben Muster, das deshalb nur einmal beschrieben ist:

- **`stelleFrage(frage)`** zeigt die Frage an, setzt eine Warteanzeige, wartet auf
  `frageBot(frage)` und zeigt die Antwort in der Art des Prototyps an.
- Das **Formular** (`#formular`) ruft beim Absenden `stelleFrage` mit dem getrimmten Text auf und
  leert das Feld; leere Eingaben werden ignoriert.
- Für jede Frage aus `VORSCHLAEGE` wird ein **Knopf oder Link** angelegt, der `stelleFrage` aufruft.
- Beim Laden zeigt der Prototyp die **Begrüßung** `findeAntwort("")`.
- Texte aus Eingaben werden per `textContent` gesetzt, nie per `innerHTML`; wo HTML nötig ist,
  maskiert eine Funktion `schutz(text)` die Zeichen `& < >`.
- Wo Text Zeichen für Zeichen erscheint, verhindert eine **laufende Nummer** (`lauf`) oder eine
  **Warteschlange** (`nacheinander`), dass sich zwei Ausgaben vermischen, wenn man während des
  Tippens schon die nächste Frage stellt.

Was darüber hinausgeht:

| Nr | Funktion | Was sie tut |
|---|---|---|
| 01 | `neueZeile(wer, text)` | Hängt eine Nutzer- oder Bot-Zeile an den Verlauf; beim ersten Mal verschwindet die leere Startansicht. |
| 01 | `streame(element, text)` | Lässt die Antwort Wort für Wort mit 25–65 ms Abstand erscheinen, mit blinkendem Punkt am Ende. |
| 02 | `blase(wer, text)` | Legt eine Sprechblase mit Uhrzeit an; eigene Blasen bekommen blaue Häkchen. |
| 02 | `stelleFrage` | Zeigt „schreibt …“ und drei hüpfende Punkte; zerlegt die Antwort in Sätze und schickt sie als einzelne Nachrichten im Abstand von 0,45 s. |
| 04 | `stelleFrage` | Schiebt Logo und Suchfeld nach oben, zeigt die Antwort als Ergebniskarte mit erfundener Suchzeit und die übrigen Fragen als „Ähnliche Fragen“. |
| 05 | `stelleFrage` | Setzt Frage und Antwort als Interview-Abschnitt; die erste Antwort bekommt eine Initiale, nach der zweiten kommt ein Zitatkasten aus deren erstem Satz. |
| 06 | `themaZu(frage)` | Ordnet eine Frage per Stichwort einem Thema zu (`beruf`, `person`, `lang`). |
| 06 | `stelleFrage` | Zeigt die Antwort in der Leiste, hebt die Stationen mit passendem `data-thema` gelb hervor und scrollt zur ersten. |
| 08 | `eintrag(frage, sofortOeffnen)` | Legt einen aufklappbaren Eintrag an; die Antwort wird beim ersten Aufklappen geholt. |
| 09 | `sprich(text)` | Schreibt den Text in die Sprechblase und bewegt dabei den Mund; ein neuer Aufruf bricht den alten ab. |
| 11 | `eintraege()` | Liste der Palette: die freie Eingabe (falls kein Vorschlag genau passt) plus die gefilterten Vorschläge. |
| 11 | `zeigeListe()`, `oeffne()`, `schliesse()` | Liste zeichnen (mit markiertem Eintrag), Palette öffnen bzw. schließen. Tasten: Strg+K oder `/` öffnen, Pfeile wählen, Enter fragt, Esc schließt. |
| 12 | `neueMail(betreff, text)` | Legt eine ungelesene Mail oben in den Posteingang. |
| 12 | `zeigeListe()`, `zeigeMail(mail)`, `zeigeFormular()` | Posteingang zeichnen; eine Mail mit Anrede und Signatur anzeigen; das Formular „Neue Frage“ zeigen, dessen Absenden die Antwort als Mail ablegt. |
| 13 | `schreibe(klasse, text)` | Schreibt einen Eintrag mit unregelmäßigem Tempo (Leerzeichen 50 ms, Buchstaben 12–42 ms). |
| 14 | `klack()` | Erzeugt ein 30-ms-Rauschen mit schnell abfallender Lautstärke als Tastenanschlag. |
| 14 | `tippe(inhalt)` | Setzt Zeichen für Zeichen vor den roten Wagen, mit Klacken; `\n` wird ein Zeilenumbruch. |
| 15 | `neuAufbauen()` | Passt das Canvas an die Fenstergröße an und erzeugt ein neues Labyrinth (28-px-Zellen). |
| 15 | `bild()` | Zeichnet Labyrinth, eine verblassende Spur der letzten 60 Positionen und den leuchtenden Punkt; `eile` bestimmt Tempo und Helligkeit (4 beim Nachdenken, sonst 1). |
| 16 | `neueAntwort(text)` | Setzt den Text sofort, erzeugt ein neues Labyrinth und startet die Leuchtspur. |
| 16 | `bild()` | Zeichnet die Spur entlang des Rundgangs; nach etwa 120 Bildern (2 s) ist sie komplett. |
| 17 | `zeichne()` | Zeichnet ein Labyrinth als Hintergrund der rechten Tür. Die Seite selbst beantwortet nichts, sie verlinkt auf 01 und `prototyp/live`. |
| 18 | `miniLabyrinth(canvas, animiert)` | Zeichnet ein 6×6-Labyrinth; wenn animiert, läuft ein roter Punkt hindurch. Gibt eine Funktion zurück, die die Animation stoppt. |
| 19 | `schreibe(text)` | Hängt Text zeichenweise (8 ms) an die Bildschirmausgabe an; vor jeder Antwort zuckt das Bild 0,3 s. |
| 20 | `nadelton(dauer)` | Kurzer Rechteckton zwischen 900 und 1400 Hz als Druckgeräusch. |
| 20 | `umbrechen(text, breite)` | Bricht Text an Wortgrenzen auf höchstens 56 Zeichen pro Zeile um. |
| 20 | `drucke(text)` | Druckt Zeile für Zeile (180 ms), mit Ton und blinkender Lampe. |
| 21 | `ausgabe(html)`, `ausfuehren(zeile)`, `neueEingabe()` | Ausgabe anhängen; Befehl ausführen (`help`, `ls`, `cat`, `whoami`, `clear`, `sudo`; `ask …` oder alles andere geht an den Bot); neue Eingabezeile mit Verlauf über Pfeiltasten. |
| 22 | `booten()`, `eingabezeile()` | Bootvorgang mit Speichertest bis 640 KB; Eingabezeile `C:\CHRIS>` mit `DIR`, `HELP`, `VER`, `CLS`, `TYPE`, sonst Frage an den Bot (Antwort in Großbuchstaben). |
| 23 | `beschreibe()` | Zeigt Name und Beschreibung des aktuellen Raums. |
| 23 | `verarbeite(eingabe)` | Versteht `frage/sprich …` (an den Bot), `schau`, `nimm/lies/untersuche <ding>` (Antwort auf die Frage des Raums, +10 Punkte beim ersten Mal), Himmelsrichtungen und `hilfe`. Zählt Züge. |
| 24 | `zeile(klasse, text)`, `verarbeite(text)` | IRC-Zeile mit Uhrzeit; `/nick`, `/me`, `!fragen` oder normale Nachricht, auf die ChrisBot mit Nennung des Nicks antwortet. |
| 25 | Fensterverwaltung | Doppelklick auf ein Symbol öffnet sein Fenster, × schließt, Titelleiste ziehen verschiebt und holt das Fenster nach vorn. |
| 26 | `zaehleHoch(ziel)` | Lässt die Seitennummer zur Zielseite laufen (große Sprünge werden auf die letzten 15 Schritte gekürzt). |
| 26 | `zeigeSeite(nummer, frage)` | 100 = Übersicht mit Begrüßung, 101–103 = vorbereitete Fragen, 888 = freie Frage. |
| 27 | `aus(text)`, `verarbeite(zeile)`, `eingabezeile()` | Ausgabe vor der Eingabezeile; BASIC-Befehle `LIST`, `RUN` (danach geht jede Zeile an den Bot, bis ESC), `PRINT`, `LOAD`, `HELP`; Zeilen mit `?` am Ende gehen an den Bot; sonst `?SYNTAX ERROR`. |
| 28 | `setze(frage)`, Knopf „Execute“ | Schreibt die Frage als JSON in den Anfragekörper; „Execute“ prüft das JSON (sonst 400), fragt den Bot und zeigt Status, Dauer und Antwort-JSON. |
| 29 | `hash(text)`, `commit(klasse, autor, text, zusatz)` | Siebenstelliger Pseudo-Hash (djb2 über Text und Zeit); Commit-Kasten oben an den Verlauf; die Markierung „HEAD → master“ bleibt nur am neuesten. |
| 30 | `farbe(wert)`, `zeige()` | Färbt JSON (Schlüssel, Zeichenketten, Zahlen, true/false/null); zeichnet das ganze Dokument neu und setzt ein Eingabefeld an die Stelle von `next.question`. |
| 31 | `zeile(html)`, `kamel(text)`, `stelleFrage` | Codezeile vor der Eingabezeile; Frage zu einem Funktionsnamen in camelCase; Antwort als Funktion mit auf 60 Zeichen umbrochenem String. Tab füllt einen Vorschlag ein. |
| 32 | `signal(an)`, `morse(text)` | Lampe, Taste und 650-Hz-Ton an/aus; Morsen nach Standard-Zeitschema (Punkt 1, Strich 3, Pause im Zeichen 1, zwischen Zeichen 3, zwischen Wörtern 7 Einheiten), Klartext läuft mit. |
| 33 | `zettel(text, klasse, neben)` | Zettel an zufälliger Stelle (Antworten neben ihrer Frage), leicht gedreht, per Maus verschiebbar. |
| 34 | `stelleFrage` | Kugel wabert mindestens 2 s; Antworten über 220 Zeichen werden mit „… mehr verraten die Sterne nicht.“ gekürzt. |
| 35 | `brich(frage)` | Schließt einen offenen Keks, bricht einen neuen auf; Zettel mit Antwort, Frage und sechs Glückszahlen. |
| 36 | `zeige`, `piep`, `warteschleife`, `antworte`, `taste` | Displaytext; Tastenton; Warteschleifenmelodie an/aus; Antwort holen; Tastenlogik (1–3 Fragen, 4 frei, 0 Warteschleife mit Platz 7→1, `#` Menü). |
| 37 | `panel(seite, figur, text, knall)` | Comic-Panel; die erste Antwort-Kachel bekommt einen „ZACK!“-Stern. Antworten werden in Zwei-Satz-Panels zerlegt. |
| 38 | `singe(titel, text)` | Antwort blass anzeigen, dann Wort für Wort hervorheben; Ball springt über das aktuelle Wort, Balken zeigt den Fortschritt. |
| 39 | `pixel`, `figur`, `bild`, `erzaehle` | Pixel zeichnen; Figur; Szene mit Sternen, Mond, Feuer und Funken (mehr beim Erzählen); Textkasten zeichenweise füllen. |
| 40 | `zeige(titel, frage)` | Antwort auf die Anzeigetafel. Haltestellen mit Frage sind Umsteigebahnhöfe; andere fragen „Was machst du beruflich?“. Am rechten Rand stehen Beschriftungen links vom Punkt. |
| 41 | `nachricht`, `zeigeLaune`, `stelleFrage` | Laune −12 pro Frage, +25 bei „danke“/„bitte“ (5–95); je schlechter, desto länger die Wartezeit und desto bissiger der Kommentar über der unveränderten Antwort. |
| 42 | `eintrag`, `verhoere` | Protokollzeile; jede dritte Frage (ab der ersten) wird erst mit einer Ausrede beantwortet, danach kommt die Antwort plus Protokollnotiz. |
| 43 | Absenden-Handler | Prüft Eigenschaft, Gegenstand und beide Kästchen mit Amtsdeutsch-Meldungen; dann Bescheid mit Aktenzeichen, Anrede, Antwort und Stempel. |
| 44 | `zeigeRunde()`, Knopf „Bestätigen“ | Drei Runden; Runde 1 und 2 brauchen genau die richtigen Kacheln, Runde 3 ist unlösbar und wird trotzdem durchgewunken; danach erscheint der Chat. |
| 45 | Knopf „Nummer ziehen“ | Bon mit Nummer, Anzeige zählt die letzten 6 Nummern hoch, Gong, Schalter öffnet. |
| 46 | `nachBrainfuck(text)` | Übersetzt UTF-8-Bytes in Brainfuck: Zelle 0 hält den Wert, Zelle 1 dient als Zähler für Zehnerschritte. |
| 46 | `interpretiere(code)`, `zeigeBand(band, zeiger)` | Führt den Code schrittweise aus (Tempo-Regler = Befehle pro Bild), markiert die Codestelle, zeigt die ersten 8 Zellen und dekodiert die Ausgabe als UTF-8. |
| 47 | `hexdump(text)` | Baut einen xxd-artigen Dump (Offset, 16 Bytes hex, Klartext); Hex und Klartext eines Bytes leuchten gemeinsam auf. |
| 48 | `groesse()`, `setzeText(text)`, `bild()` | Canvas anpassen; Buchstaben als Teilchen mit Zielposition anlegen, nach 2 s fallen lassen; Physik: Schwerkraft mit Höhenprofil in 14-px-Spalten oder Zurückfedern zum Ziel; schnelle Mausbewegungen schubsen. |
| 49 | `setzeText(text)`, `bild(jetzt)` | Wörter mit Zielposition und eigener Kreisbahn anlegen; bei Bewegung kreisen sie, nach 0,8 s Ruhe gleiten sie an ihren Platz. |
| 50 | `fliehe(mx, my)`, `gibAuf()` | Feld springt an eine Stelle mindestens 260 px von der Maus weg (höchstens alle 0,4 s); nach 7 Fluchten (Touch: 3) oder beim Fokus per Tastatur bleibt es stehen. |

## Tests

```bash
cd prototyp/08-chatbot-galerie
for t in tests/*.test.js; do node "$t"; done
```

| Datei | Prüft |
|---|---|
| `tests/antworten.test.js` | Stichwortsuche (ganze Wörter, Groß-/Kleinschreibung), Begrüßung bei leerer Frage, „weiß ich nicht“. |
| `tests/labyrinth-mini.test.js` | Jede Zelle wird erreicht; der Rundgang springt nie. |
| `tests/katalog.test.js` | 50 Einträge, passend zu den Ordnern, gültige Abteilungen und Wertungen, Vorschaubild vorhanden. |

Die Oberflächen selbst sind Wegwerf-Prototypen und nicht unit-getestet. Stattdessen öffnet
`node werkzeuge/pruefe-alle.js` jeden Prototyp in Chrome, stellt eine Frage (bei Sonderfällen
wie Captcha, Formular, Telefon über eigene Klickfolgen), meldet JavaScript-Fehler und erneuert
das Vorschaubild. Stand 2026-10-31: keine Fehler in allen 50. Nur einzelne Nummern prüfen:
`node werkzeuge/pruefe-alle.js 09 14`.

## Was nicht geprüft ist

- **Handy:** Die Prototypen sind am Rechner (1280×800) geprüft. Viele passen sich an schmale
  Bildschirme an, einige (Retro-Desktop, Code-Editor, Videotext, Befehlspalette) sind klar
  Desktop-Ideen. Für die zwei, drei Favoriten wäre das der nächste Schritt.
- **Barrierefreiheit:** nicht systematisch. Canvas-Prototypen (16, 39, 48) haben keinen
  Text für Screenreader; die Fluchtknopf-Seite (50) ist per Tastatur sofort bedienbar.
- **Ton:** 14, 20, 32, 36, 45 erzeugen Töne mit der Web Audio API, die Lautstärken sind nicht
  abgestimmt.
- **Echtes Backend:** Alle fragen den Schein-Bot. Für den echten Bot würde in `frageBot` ein
  `fetch` mit `{"question": …}` an das Lambda stehen (Vertrag: `backend/schema/`).
- **Fremde Marken:** 01 (ChatGPT), 04 (Suchmaschine), 25 (Windows 95), 27 (C64) zitieren
  bekannte Oberflächen. Als lokale Skizze in Ordnung; für eine öffentliche Seite müssten Logo,
  Farben und Namen eigene werden.
