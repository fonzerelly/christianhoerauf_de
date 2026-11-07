// Prüft die gebaute Einzeldatei (baue-einzeldatei.sh): lädt sie, stellt eine Frage, zählt die
// Einträge der zugeklappten Zeitleiste, prüft das eingebettete Foto und meldet Konsolenfehler;
// dazu ein Bildschirmfoto.
// Aufruf über ../fotografiere.sh einzeldatei
const { chromium } = require("playwright-core");

(async () => {
  const browser = await chromium.launch();
  const seite = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const fehler = [];
  seite.on("pageerror", (e) => fehler.push(e.message));
  seite.on("console", (m) => {
    if (m.type() === "error" && !/CORS|ERR_FAILED/.test(m.text())) fehler.push(m.text());
  });
  await seite.goto("file:///ziel/index.html");
  await seite.waitForTimeout(3000);
  await seite.fill("#question", "Kafka?");
  await seite.press("#question", "Enter");
  await seite.waitForTimeout(2500);
  await seite.screenshot({ path: "/ausgabe/einzeldatei.png" });
  const eintraege = await seite.locator(".zlZeile button").count();
  const foto = await seite.evaluate(() => fotoVonChris.naturalWidth);
  console.log(`Einträge zugeklappt: ${eintraege} | Foto fürs Gimmick: ${foto} px breit | Fehler: ${fehler.length ? fehler.join("; ") : "keine"}`);
  await browser.close();
})();
