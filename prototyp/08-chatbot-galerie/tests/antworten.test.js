// Tests für gemeinsam/antworten.js. Start: node tests/antworten.test.js
const assert = require("node:assert");
const { findeAntwort, ANTWORTEN } = require("../gemeinsam/antworten.js");

// Stichwort als ganzes Wort, egal ob groß oder klein geschrieben
assert.strictEqual(findeAntwort("Wer bist du?"), ANTWORTEN.eintraege[0].antwort);
assert.strictEqual(findeAntwort("WAS MACHST DU BERUFLICH"), ANTWORTEN.eintraege[1].antwort);
assert.strictEqual(findeAntwort("erzähl mir was langes"), ANTWORTEN.eintraege[2].antwort);
// "hi" darf nicht in "Schiff" gefunden werden: unbekannte Frage
assert.strictEqual(findeAntwort("Schiff ahoi"), ANTWORTEN.unbekannt);
// Leere Frage liefert die Begrüßung
assert.strictEqual(findeAntwort("   "), ANTWORTEN.begruessung);

console.log("alle Tests grün");
