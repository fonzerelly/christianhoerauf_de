# Brainstorming 2026-10-31: Welche Alternative zum Labyrinth?

**Thema:** ein oder zwei Designs neben dem Labyrinth, die ein Personaler sofort versteht.
**Ziel:** schnell lesbar, bleibt im Gedächtnis, passt zu Visitenkarte und Briefpapier.
**Rahmen:** Personaler hat wenig Zeit und wenig Technikwissen, kennt aber die gesuchten
Schlagworte. Das Labyrinth bleibt. Briefpapier ist weiß mit dunklem Labyrinth-Streifen oben.
Keine Teambank-Farben (03). 25 wäre wegen Fensterverwaltung viel Aufwand.

**Favoriten aus der Galerie:** 03, 15, 16, 17, 18, 25, 33, 39; nerdig: 27 (C64), 47 (Hexdump).

## Ideen

**[Struktur 1] Zwei Türen (17)**
_Konzept:_ Startseite fragt: klassisch oder Labyrinth. Die alte Idee bleibt erhalten.
_Neu daran:_ Der Besucher wählt selbst.

**[Struktur 2] 18 als „klassische Tür“**
_Konzept:_ Normaler, heller Chat; nur Logo und Ladeanzeige sind ein Mini-Labyrinth.
_Neu daran:_ Knüpft ans Briefpapier an, sofort bedienbar.

**[Labyrinth 3] Lichtpunkt schreibt nur das Schlüsselwort (Mischung aus 15 und 16)**
_Konzept:_ Antwort sofort leicht schattiert über dem Labyrinth, der Punkt schreibt nur das
wichtigste Wort.
_Neu daran:_ Die Animation hält nicht mehr auf, sie betont nur. → gebaut als Prototyp 9a.

**[Ordnung 4] Kühlschrankzettel, die herunterfallen (33)**
_Konzept:_ Begrenzte Pinnwand, alte Zettel fallen ab, wenn neue kommen.
_Neu daran:_ Löst „was ist bei 100 Nachrichten“ mit einer Spielregel.

**[Gefühl 5] Lagerfeuer, C64, Hexdump**
_Konzept:_ Viel Charme, eher für Nerds. Offen: wo sie leben dürfen, ohne Personaler aufzuhalten.

**[Marke 6] Die Website als Briefpapier**
_Konzept:_ Oben schmales dunkles Band mit rotem „CHRIS“ wie im Briefkopf, darunter Weiß.
_Neu daran:_ Dritte Begegnung mit demselben Bild (Karte, Brief, Website).

**[Marke 7] Antwort als Briefbogen über dem Labyrinth** (verworfen)
_Konzept:_ Weißes „Blatt“ über dem vollflächigen Labyrinth.
_Einwand (Christian):_ Geometrisch fast dasselbe wie Briefpapier mit Labyrinth-Zeile; ein Blatt,
auf dem sich Text bildet, wäre Harry Potter.

**[Verbindung 8] Rotes Wort im Text, rotes Wort im Labyrinth**
_Konzept:_ Das Schlüsselwort ist in der Antwort im selben Rot markiert wie die Leuchtspur.
_Neu daran:_ Das Labyrinth wird zur Fußnote der Antwort statt zur Deko. Dann ist zweitrangig,
ob es Streifen oder Bühne ist. → in beiden Varianten von Prototyp 9 umgesetzt.

**[Wild 9] Tom Riddles Tagebuch**
_Konzept:_ Leeres Blatt; man schreibt eine Frage hinein, die Tinte versickert, die Antwort
erscheint in Handschrift.
_Gibt es schon als Grundidee:_ [MaximeRivest/riddle](https://github.com/MaximeRivest/riddle)
(MIT, rund 1,9k Sterne). Gleich ist die Idee selbst: man schreibt mit dem Stift, „die Seite
trinkt die Tinte“, die Antwort erscheint Strich für Strich in Handschrift (Dancing Script,
zu Einzelstrichen skelettiert) und verblasst wieder; dazu ein Gedächtnis („zeig mir, was ich
über … geschrieben habe“). Anders ist das Medium: Es ist eine App für das E-Ink-Tablet
reMarkable Paper Pro (Rust, Gerät im Entwicklermodus, Stifteingabe), die Handschrift geht als
Bild an ein Vision-Sprachmodell. Für eine Website müsste man es neu denken: Eingabe per
Tastatur, Antwort in Handschrift-Schrift, Versickern und Schreiben als Animation.
_Einordnung:_ Wieder eine Antwort, die erst animiert entsteht, also für Personaler genau das
Problem des Labyrinths. Eher Nebenprojekt oder versteckter Modus.

## Recherche: Wirkt das Schlüsselwort „unterbewusst“?

- Echte unterschwellige Reize wirken kaum (Meta-Analyse Trappey 1996: r ≈ 0,06) und nur, wenn
  sie zum aktuellen Ziel passen (Karremans 2006, „Lipton Ice“ nur bei Durst).
- Der Lichtpunkt ist nicht unterschwellig, er ist das Auffälligste auf der Seite. Passender:
  beiläufige Wahrnehmung verbessert die Einstellung, abhängig von der Lage zum gelesenen Text
  (Janiszewski 1990); Wiederholung erhöht Gefallen, stärker ohne bewusste Erinnerung
  (Mere Exposure, Bornstein 1989).
- Folgerungen: Das Wort muss das sein, wonach der Personaler sucht (Schlagwort aus der
  Stellenanzeige). Die größere Wirkung kommt vermutlich aus der Wiederholung des Designs
  (Karte, Brief, Website). Bewegungsbeginn zieht den Blick (Abrams & Christ 2003): Der Punkt
  konkurriert mit dem Text, wenn beide gleichzeitig starten.
- Werbebanner-Blindheit (NN/g) trifft Elemente, die wie Werbung platziert oder animiert sind
  und nichts mit der Aufgabe zu tun haben. Entscheidend ist, ob das Wort sichtbar zur Antwort
  gehört, nicht ob es oben im Streifen oder auf der ganzen Fläche steht.

## Offen

- Woher kommt das Schlüsselwort: vom Bot gewählt, aus einer festen Liste der Kernkompetenzen
  oder aus der Stellenanzeige?
- Wie wird die Wartezeit bis zur Antwort überbrückt?
- A (Overlay über dem Labyrinth) oder B (Briefpapier mit lebendigem Briefkopf)?
