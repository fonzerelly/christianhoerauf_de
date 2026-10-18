// Tests für einstellungen.js. Aufruf im Prototyp-Ordner: node --test

const test = require("node:test");
const assert = require("node:assert");
const { loadBrowserScripts } = require("./lade-browser-skripte");

const settings = loadBrowserScripts(["einstellungen.js"]);

test("?seed= in der Adresse liefert den Startwert als Zahl", () => {
  assert.strictEqual(settings.seedFromQuery("?seed=123"), 123);
  assert.strictEqual(settings.seedFromQuery("?profil=handy&seed=7"), 7);
  assert.strictEqual(settings.seedFromQuery("?seed=0"), 0);
});

test("ohne brauchbaren Startwert in der Adresse kommt null", () => {
  assert.strictEqual(settings.seedFromQuery(""), null);
  assert.strictEqual(settings.seedFromQuery("?profil=handy"), null);
  assert.strictEqual(settings.seedFromQuery("?seed="), null);
  assert.strictEqual(settings.seedFromQuery("?seed=abc"), null);
  assert.strictEqual(settings.seedFromQuery("?seed=1.5"), null);
  assert.strictEqual(settings.seedFromQuery("?seed=-3"), null);
});
