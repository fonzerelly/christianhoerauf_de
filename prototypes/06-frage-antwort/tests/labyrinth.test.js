// Tests für labyrinth.js: Ein Labyrinth muss sich aus seinem Startwert 1:1 wieder
// erzeugen lassen. Aufruf im Prototyp-Ordner: node --test

const test = require("node:test");
const assert = require("node:assert");
const crypto = require("node:crypto");
const { loadBrowserScripts } = require("./lade-browser-skripte");

const maze = loadBrowserScripts(["schrift.js", "labyrinth.js"]);

// Feste Werte statt config.js: Wer dort an den Reglern dreht, soll diese Tests nicht kaputt
// machen. Prozentwerte stehen hier schon als Anteile (0 bis 1), wie readSettings sie liefert.
const OPTIONS = {
  windiness: 0.7,
  detour: 0.3,
  entranceSide: "random",
  exitSide: "random",
  maxLinesPerPage: 12,
  returnBandRows: 2,
  returnWindiness: 0.5,
  maxWallRun: 4,
};

// Die Begrüßung der Besucherfassung auf einem Handy-Raster.
const TEXT = "Hier ent|steht die Inter|net|prä|senz von Chris|tian Hör|auf";
const COLS = 34;
const ROWS = 60;

function generate(seed) {
  return maze.generateMessagePages(TEXT, COLS, ROWS, seed, OPTIONS);
}

// Eine kurze Prüfsumme über alle Seiten: Wände, Route, Eingang, Ausgang, Zeilen.
function fingerprintOf(pages) {
  return crypto.createHash("sha256").update(JSON.stringify(pages)).digest("hex").slice(0, 16);
}

test("gleicher Startwert ergibt dasselbe Labyrinth", () => {
  assert.deepStrictEqual(generate(1), generate(1));
});

test("anderer Startwert ergibt ein anderes Labyrinth", () => {
  assert.notDeepStrictEqual(generate(1), generate(2));
});

// Hält das Labyrinth zu Startwert 1 fest. Schlägt dieser Test fehl, hat eine Änderung am
// Algorithmus (oder an schrift.js) das Labyrinth verändert - ein bisher notierter Startwert
// zeigt dann ein anderes Bild. Ist das gewollt, den neuen Wert aus der Fehlermeldung
// ("actual") hier eintragen.
test("Startwert 1 ergibt weiterhin genau das bekannte Labyrinth", () => {
  assert.strictEqual(fingerprintOf(generate(1)), "bbb0853e0b4c65cc");
});
