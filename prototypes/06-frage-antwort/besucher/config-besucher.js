// Die Besucherfassung für christianhoerauf.de.
//
// Diese Datei wird NUR in live/index.html eingebaut (siehe baue-einzeldatei.sh), und zwar
// direkt hinter config.js. Sie überschreibt dort einzelne Werte; alles andere - auch die
// Geräteprofile - bleibt, wie es in config.js steht.
//
// Ein "|" markiert eine Trennstelle für lange Wörter und wird nie angezeigt.

Object.assign(CONFIG, {
  // Besucher bekommen keine Regler und keine Testhilfe, dafür den Knopf "Nochmal".
  showControls: false,
  showReplayButton: true,
  allowLiteralAnswers: false,

  // Schreibt der Lichtpunkt beim Laden. Derselbe Satz steht für Screenreader und
  // Suchmaschinen noch einmal in besucher/inhalt.html - bei Änderungen beide anpassen.
  greeting: "Hier ent|steht die Inter|net|prä|senz von Chris|tian Hör|auf",

  // Die Antwort auf jede Frage: Es gibt keine Stichwörter, also passt nie eines.
  answers: [],
  unknownAnswer: "Ich bin noch ein Pro|to|typ. Ich kann noch nicht ant|wor|ten.",
});
