// Prototyp 10: Config-Änderungen, die gelten müssen, bevor seite.js aus Prototyp 6 startet.
// Wird nach config.js und vor seite.js geladen; alles andere steht in redesign.js.

Object.assign(CONFIG, {
  showControls: false,
  showReplayButton: false, // „Nochmal“ entfällt (Q5)
  allowLiteralAnswers: false,
  greeting: "HALLO", // nur für den ersten Augenblick; redesign.js baut die Begrüßung neu
});

// Das Stichwort bleibt stehen, bis die nächste Antwort kommt (wie Prototyp 9a).
CONFIG.base.restBrightness = 100;
