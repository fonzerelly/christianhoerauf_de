// Prüft, dass Katalog, Ordner und Vorschaubilder zusammenpassen. Start: node tests/katalog.test.js
const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");
const { KATALOG, ABTEILUNGEN } = require("../gemeinsam/katalog.js");

const galerie = path.join(__dirname, "..");
const ordner = fs.readdirSync(galerie).filter((d) => /^\d\d-/.test(d)).sort();

assert.strictEqual(KATALOG.length, 50);
assert.deepStrictEqual(KATALOG.map((e) => e.ordner), ordner);
for (const e of KATALOG) {
  assert.ok(ABTEILUNGEN[e.abteilung], e.ordner + ": unbekannte Abteilung " + e.abteilung);
  assert.ok(e.hr >= 1 && e.hr <= 5 && e.nerd >= 1 && e.nerd <= 5, e.ordner + ": Wertung außerhalb 1–5");
  assert.ok(fs.existsSync(path.join(galerie, e.ordner, "index.html")), e.ordner + ": index.html fehlt");
  assert.ok(fs.existsSync(path.join(galerie, "vorschau", e.ordner.slice(0, 2) + ".jpg")), e.ordner + ": Vorschaubild fehlt");
}
console.log("alle Tests grün");
