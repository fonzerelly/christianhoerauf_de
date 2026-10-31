// Tests für gemeinsam/labyrinth-mini.js. Start: node tests/labyrinth-mini.test.js
const assert = require("node:assert");
const { erzeugeLabyrinth } = require("../gemeinsam/labyrinth-mini.js");

for (let versuch = 0; versuch < 20; versuch++) {
  const lab = erzeugeLabyrinth(12, 9);
  // Jede Zelle wird erreicht
  assert.ok(lab.zellen.every((z) => z.besucht));
  // Der Rundgang springt nie: aufeinanderfolgende Zellen sind direkte Nachbarn
  lab.rundgang.forEach((z, i) => {
    if (i === 0) return;
    const vorher = lab.rundgang[i - 1];
    assert.strictEqual(Math.abs(z.x - vorher.x) + Math.abs(z.y - vorher.y), 1);
  });
}
console.log("alle Tests grün");
