// Prototyp 11: Config-Änderungen, die gelten müssen, bevor seite.js aus Prototyp 6 startet.
// Wird nach config.js und vor seite.js geladen; alles andere steht in buehne.js,
// zeitleiste.js und oberflaeche.js.

Object.assign(CONFIG, {
  showControls: true, // der Knopf „Schalter“ öffnet Schalter und Regler
  showReplayButton: false, // „Nochmal“ entfällt
  allowLiteralAnswers: false,
  greeting: "HALLO", // nur für den ersten Augenblick; oberflaeche.js baut die Begrüßung neu
});

// Ob ein Wort stehen bleibt, regelt buehne.js je Durchlauf. Die Rest-Helligkeit aus
// Prototyp 6 bleibt deshalb aus.
CONFIG.base.restBrightness = 0;
// Dunkle Ecken schwach (Q25); der Schalter „Dunkle Ecken“ setzt diesen Regler.
CONFIG.base.vignetteStrength = 20;
// Das Bedienfeld ist beim Laden zu, auch auf dem Desktop.
CONFIG.profiles.desktop.controlsOpen = false;

// Handy: kleinere Zellen für 10 Zeichen je Zeile (beschlossen 06.11.). Nach textCapacity in
// labyrinth.js braucht das 45 Spalten (2 × 3 Spalten Rand, je Zeichen 4); bei 375 px Breite
// sind das gut 8 px je Zelle statt 11 px. Wände, Spur und Leuchten sind im selben Verhältnis
// dünner als im Profil „handy“ von Prototyp 6.
Object.assign(CONFIG.profiles.handy, {
  cellColumns: 45,
  wallWidth: 1.1,
  bloomRadius: 2.5,
  bloomStrength: 70,
  trailWidth: 2.2,
  glow: 5,
  glitchStrength: 6,
});
