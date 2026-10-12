// Die Config: alles, was Christian ohne Programmieren ändern können soll.
//
//   1. die Antwort-Tabelle (Platzhalter!)
//   2. die Grundwerte aller Regler (base)
//   3. die Geräteprofile (profiles): jedes überschreibt einzelne Grundwerte
//
// Welches Profil gilt, entscheidet beim Laden die Fensterbreite (desktopFromWidth).
// Die Regler auf der Seite starten mit den Werten des aktiven Profils. Der Knopf
// "Aktuelle Werte als Config anzeigen und kopieren" liefert den fertigen Text für
// einen Profil-Block, der hier unten eingefügt werden kann.

const CONFIG = {
  // Ab dieser Fensterbreite (in Pixeln) gilt das Profil "desktop", darunter "handy".
  desktopFromWidth: 700,

  // Gibt es den Knopf "Regler" und die Regler-Leiste? Die Besucherfassung schaltet beides ab
  // (siehe besucher/config-besucher.js); dann gelten einfach die Werte des Geräteprofils.
  showControls: true,

  // Gibt es neben dem Fragefeld den Knopf "Nochmal", der das zuletzt Geschriebene noch
  // einmal schreibt? Hier aus, weil die Regler-Leiste dafür schon einen Knopf hat und am
  // Handy sonst kaum Platz für das Fragefeld bleibt.
  showReplayButton: false,

  // Testhilfe: Beginnt die Frage mit "=", wird der Rest wörtlich geschrieben.
  allowLiteralAnswers: true,

  // -------------------------------------------------------------------------
  // PLATZHALTER-ANTWORTEN
  //
  // Diese Texte sind frei erfunden und sagen bewusst NICHTS über Christians
  // Lebenslauf. Später antwortet hier ein Sprachmodell. Bis dahin dient die
  // Tabelle nur dazu, den Ablauf Frage -> Antwort auszuprobieren.
  //
  // Abgleich: Die Frage wird in Kleinbuchstaben und einzelne Wörter zerlegt.
  // Ein Eintrag passt, wenn eines seiner Stichwörter als ganzes Wort (oder als
  // ganze Wortfolge) in der Frage vorkommt. Der erste passende Eintrag gewinnt.
  //
  // Trennstellen: Ein "|" in einem Text markiert, wo ein Wort getrennt werden darf, wenn
  // es nicht in eine Zeile passt ("INTER|NET|PRÄ|SENZ"). Das Zeichen wird nie angezeigt.
  // Ohne passende Trennstelle wird nach Platz getrennt.
  // Erlaubte Zeichen: A-Z, ÄÖÜ, 0-9, Bindestrich, Punkt, Fragezeichen. ß wird zu SS.
  // -------------------------------------------------------------------------

  // Schreibt der Lichtpunkt beim Laden der Seite.
  greeting: "HALLO FRAG MICH ETWAS",

  // Schreibt der Lichtpunkt, wenn kein Stichwort passt.
  unknownAnswer: "WEISS ICH NICHT",

  answers: [
    { keywords: ["wer bist du", "wie heißt du", "wie heisst du", "dein name", "name"], answer: "CHRISTIAN HÖRAUF" },
    { keywords: ["hallo", "hi", "hey", "moin", "servus", "guten tag", "guten morgen", "guten abend"], answer: "HALLO" },
    { keywords: ["wie geht es dir", "wie gehts", "wie geht's"], answer: "GUT UND DIR?" },
    { keywords: ["danke", "dankeschön", "vielen dank"], answer: "GERN GESCHEHEN" },
    { keywords: ["tschüss", "tschüs", "ciao", "auf wiedersehen", "bis bald"], answer: "BIS BALD" },
    // Zum Ausprobieren mehrerer Seiten:
    { keywords: ["lang", "lange", "langer", "seiten"], answer: "DAS IST EIN LANGER PLATZHALTER-TEXT ZUM AUSPROBIEREN MEHRERER SEITEN" },
  ],

  // -------------------------------------------------------------------------
  // GRUNDWERTE
  //
  // Jeder Name ist zugleich die id eines Reglers in index.html (Ausnahme: controlsOpen).
  // Die Einheiten sind die der Regler, Prozentwerte stehen also als 0 bis 100 da.
  // -------------------------------------------------------------------------
  base: {
    // Frage und Antwort
    showAnswerAsText: false, // Antwort nach dem Ende der Animation zusätzlich als normalen Text zeigen
    rushFactor: 6, // kommt eine neue Frage mitten im Schreiben: so viel mal schneller läuft der Punkt den Rest hinaus
    blurInputAfterSending: false, // nach dem Senden das Fragefeld verlassen (schließt am Handy die Tastatur)
    controlsOpen: false, // ist die Regler-Leiste beim Laden aufgeklappt?

    // Tempo
    speed: 60, // Zellen pro Sekunde in Buchstaben
    connectorSpeedFactor: 3, // auf Verbindungswegen so viel mal schneller

    // Leuchtspur (Nachleuchten)
    holdSeconds: 0.6, // leuchtet voll für ... Sekunden
    fadeSeconds: 0.8, // blendet danach aus innerhalb von ... Sekunden
    restBrightness: 0, // Rest-Helligkeit danach in % (100 = Text bleibt stehen)

    // Monitor
    bloomRadius: 7, // Überstrahlen: Reichweite
    bloomStrength: 80, // Überstrahlen: Stärke in %
    scanlineStrength: 35, // Zeilenraster in %
    vignetteStrength: 55, // dunkle Ecken in %
    flickerStrength: 25, // Flimmern in %
    glitchesPerMinute: 8, // Bildstörungen pro Minute
    glitchStrength: 14, // Versatz der Störung in Pixeln

    // Seiten
    maxLinesPerPage: 12, // höchstens so viele Textzeilen pro Seite
    scrollSeconds: 1.2, // Dauer des Weiterschiebens

    // Zeilenwechsel
    returnBandRows: 2, // Höhe des Bands, in dem der Punkt zum Zeilenanfang zurückläuft (1 = gerade wie in Prototyp 5)
    returnWindiness: 50, // wie stark sich der Rückweg im Band windet (0 bis 100)
    maxWallRun: 4, // längstes gerades Wandstück unter Verbindungsspur und Rückweg in Zellen (0 = Wände nicht unterbrechen)

    // Eingang und Ausgang
    entranceSide: "random", // "random", "left", "top" oder "bottom" (gilt für die erste Seite nach dem Laden)
    exitSide: "random", // "random", "right", "top" oder "bottom"
    detour: 30, // Umwege bei An- und Ablauf (0 bis 100)

    // Labyrinth
    seed: 1, // Zufalls-Startwert
    cellColumns: 0, // feste Anzahl Spalten; 0 = die Zellgröße bestimmt die Spaltenzahl
    cellSize: 24, // Zellgröße in Pixeln (gilt nur bei cellColumns: 0)
    windiness: 70, // Gewundenheit der Füll-Gänge (0 bis 100)
    wallWidth: 3, // Wandstärke in Pixeln

    // Lichtpunkt und Spur
    connectorOpacity: 25, // Sichtbarkeit der Verbindungswege in %
    trailWidth: 5, // Spurstärke in Pixeln
    glow: 16, // Leuchten der Spur
    showPlannedPath: false, // geplanten Weg gestrichelt zeigen

    // Farben
    backgroundColor: "#03140a",
    wallColor: "#2bdc5a",
    trailColor: "#ff2a2a",
    dotColor: "#ff2a2a",

    // Leistung
    maxPixelRatio: 3, // höchste Pixeldichte des Bildes; kleiner = unschärfer, aber schneller
  },

  // -------------------------------------------------------------------------
  // GERÄTEPROFILE: nur die Werte, die von den Grundwerten abweichen.
  // Die Werte sind geschätzt und von Christian noch nicht bestätigt.
  // -------------------------------------------------------------------------
  profiles: {
    desktop: {
      controlsOpen: true,
    },

    // Kleine Zellen: 34 Spalten ergeben 7 Zeichen pro Zeile (bei 375 px Breite rund 11 px je Zelle).
    // Wände, Spur und Leuchten sind auf diese Zellgröße heruntergerechnet.
    handy: {
      blurInputAfterSending: true,
      cellColumns: 34,
      wallWidth: 1.5,
      bloomRadius: 3,
      bloomStrength: 70,
      trailWidth: 3,
      glow: 7,
      glitchStrength: 8,
      scrollSeconds: 1,
      maxPixelRatio: 2,
    },
  },
};
