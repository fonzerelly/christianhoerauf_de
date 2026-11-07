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

// Wände, Spur, Leuchten und Bildstörung für eine Zellgröße am Desktop, im selben Verhältnis wie
// die Grundwerte zu 24 px. Gerundet wie die Regler (Wand und Spur auf halbe Pixel).
function aussehenFuerZellgroesse(zelle) {
  const faktor = zelle / CONFIG.base.cellSize;
  const aufHalbe = (wert) => Math.max(0.5, Math.round(wert * faktor * 2) / 2);
  return {
    cellSize: zelle,
    wallWidth: aufHalbe(CONFIG.base.wallWidth),
    trailWidth: aufHalbe(CONFIG.base.trailWidth),
    glow: Math.round(CONFIG.base.glow * faktor),
    bloomRadius: Math.round(CONFIG.base.bloomRadius * faktor),
    glitchStrength: Math.round(CONFIG.base.glitchStrength * faktor),
  };
}

// Desktop: Zellen 16 statt 24 px, damit die Bühne bei 240 px Höhe 15 Reihen hat und Herz und Foto
// darauf passen (Christian, 07.11., Möglichkeit 2). Das Bedienfeld kann andere Raster zeigen.
Object.assign(CONFIG.profiles.desktop, aussehenFuerZellgroesse(16));

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

// Kein Sprung nach oben, wenn das Fragefeld den Fokus verliert (07.11.). seite.js setzt dafür in
// connectControls einen Lauscher, gedacht für iOS, das die Seite für die Tastatur verschiebt und
// nicht immer zurückschiebt. Im neuen Aufbau scrollt die Seite aber ohnehin, und der Sprung schadet:
// Drückt man mit der Maus auf „Senden“, verliert das Feld den Fokus, die Seite springt, der Knopf
// rutscht unter dem Zeiger weg und der Klick geht verloren. Dieser Lauscher wird VOR dem aus
// seite.js angemeldet und hält ihn auf.
document.getElementById("question").addEventListener("blur", (ereignis) => ereignis.stopImmediatePropagation());
