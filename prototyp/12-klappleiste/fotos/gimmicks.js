// Herz, Smiley und Foto auf der Bühne, je in mehreren Rastern auf Desktop und Handy. Fotografiert
// die Bühne mittendrin (gut die Hälfte des ersten Durchlaufs) und wenn der letzte fertig ist (dann
// bleibt das Bild stehen); meldet, ob das Gimmick passt, und Konsolenfehler.
// Aufruf über ../fotografiere.sh gimmicks
const { chromium } = require("playwright-core");
const ADRESSE = "file:///repo/prototyp/12-klappleiste/index.html";
const AUSGABE = "/ausgabe";

const LAEUFE = [
  { name: "desktop-16x15", viewport: { width: 1440, height: 900 }, feld: "p12RasterDesktop", wert: "16x15" },
  { name: "desktop-10x24", viewport: { width: 1440, height: 900 }, feld: "p12RasterDesktop", wert: "10x24" },
  { name: "handy-18", viewport: { width: 390, height: 844 }, feld: "p12ReihenHandy", wert: "18" },
  { name: "handy-22", viewport: { width: 390, height: 844 }, feld: "p12ReihenHandy", wert: "22" },
];
const GIMMICKS = ["herz", "smiley", "foto"];

async function fotoDerBuehne(seite, datei) {
  const box = await seite.evaluate(() => {
    const b = document.getElementById("stage").getBoundingClientRect();
    return { x: b.left, y: b.top + window.scrollY, width: b.width, height: b.height };
  });
  await seite.screenshot({ path: `${AUSGABE}/${datei}`, clip: box, fullPage: true });
}

// Wartet, bis die Seite der Antwort mit diesem Gimmick läuft und der Lichtpunkt `anteil` des Wegs
// hinter sich hat: im ersten Durchlauf, bei 1 (fertig) im letzten.
async function warteAuf(seite, gimmick, anteil) {
  await seite.waitForFunction(
    ([g, a]) => {
      const p = currentPage();
      if (!p || p.answer !== scene.answer || scene.answer.gimmick !== g) return false;
      const letzterLauf = Math.max(1, SCHALTER.durchlaeufe) - 1;
      if (a >= 1) return scene.answer.lauf === letzterLauf && scene.phase === "finished";
      if (scene.answer.lauf !== 0) return false;
      return scene.phase === "writing" && scene.progress >= a * (p.route.length - 1);
    },
    [gimmick, anteil],
    { timeout: 40000, polling: 50 }
  );
}

(async () => {
  const browser = await chromium.launch();
  for (const lauf of LAEUFE) {
    const seite = await browser.newPage({ viewport: lauf.viewport, deviceScaleFactor: 1 });
    const fehler = [];
    seite.on("pageerror", (e) => fehler.push("pageerror: " + e.message));
    seite.on("console", (m) => {
      if (m.type() === "error" && !/CORS|ERR_FAILED/.test(m.text())) fehler.push(m.text());
    });
    await seite.goto(ADRESSE);
    await seite.waitForTimeout(1500);
    await seite.evaluate(([id, wert]) => {
      const feld = document.getElementById(id);
      feld.value = wert;
      feld.dispatchEvent(new Event("input"));
    }, [lauf.feld, lauf.wert]);
    await seite.waitForTimeout(500);
    const groesse = await seite.evaluate(() => `${scene.cols} × ${scene.rows} Zellen à ${scene.cellSize} px, Bühne ${document.getElementById("stage").offsetHeight} px hoch`);
    console.log(`== ${lauf.name}: ${groesse}`);

    for (const gimmick of GIMMICKS) {
      await seite.evaluate((g) => stelleFrage("Gimmick: " + g, g), gimmick);
      await warteAuf(seite, gimmick, 0.55);
      await fotoDerBuehne(seite, `gimmick-${lauf.name}-${gimmick}-1-mitte.png`);
      await warteAuf(seite, gimmick, 1);
      await fotoDerBuehne(seite, `gimmick-${lauf.name}-${gimmick}-2-fertig.png`);
      console.log("   " + (await seite.textContent("#p12GimmickHinweis")));
    }
    console.log(`   Fehler: ${fehler.length ? fehler.join("\n   ") : "keine"}`);
    await seite.close();
  }
  await browser.close();
})();
