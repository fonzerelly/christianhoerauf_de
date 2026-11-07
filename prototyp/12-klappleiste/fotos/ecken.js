// Nahaufnahmen der Zeitleiste: linke und rechte Ecke (Pfeile, L-Knopf, Bildlaufleiste),
// aufgeklappt und zugeklappt, auf Desktop und Handy. Prüft dabei, ob sich der Griff der
// Bildlaufleiste ziehen lässt. Aufruf über ../fotografiere.sh ecken
const { chromium } = require("playwright-core");
const ADRESSE = "file:///repo/prototyp/12-klappleiste/index.html#NDcxMXxGcmF1IEVyaWthIE11c3RlcnxlOWJk";
const AUSGABE = "/ausgabe";
const BREITE_DER_ECKE = 420; // so viele Pixel der Zeitleiste zeigt eine Nahaufnahme

const GERAETE = [
  { name: "desktop", viewport: { width: 1440, height: 900 }, pixeldichte: 2 },
  { name: "handy", viewport: { width: 390, height: 844 }, pixeldichte: 3 },
];

// Fotografiert die linke und die rechte Ecke der Zeitleiste.
async function fotografiereEcken(seite, praefix) {
  const zeitleiste = await seite.locator("#zeitleiste").boundingBox();
  const breite = Math.min(BREITE_DER_ECKE, zeitleiste.width) + 8;
  const oben = zeitleiste.y - 4;
  const hoehe = zeitleiste.height + 8;
  const links = Math.max(0, zeitleiste.x - 4);
  const rechts = Math.max(0, zeitleiste.x + zeitleiste.width + 4 - breite);
  await seite.screenshot({ path: `${AUSGABE}/${praefix}-links.png`, clip: { x: links, y: oben, width: breite, height: hoehe } });
  await seite.screenshot({ path: `${AUSGABE}/${praefix}-rechts.png`, clip: { x: rechts, y: oben, width: breite, height: hoehe } });
}

// Zieht den Griff der Bildlaufleiste 150 px nach links und meldet, wie weit die Zeitleiste folgt.
async function ziehGriff(seite, name) {
  const griff = await seite.locator(".zlGriff").boundingBox();
  if (!griff || griff.width === 0) {
    console.log(`${name}: keine Bildlaufleiste (Inhalt passt)`);
    return;
  }
  await seite.mouse.move(griff.x + griff.width / 2, griff.y + 2);
  await seite.mouse.down();
  await seite.mouse.move(griff.x + griff.width / 2 - 150, griff.y + 2, { steps: 5 });
  await seite.mouse.up();
  const stand = await seite.evaluate(() => {
    const scroll = document.querySelector(".zlScroll");
    return `${Math.round(scroll.scrollLeft)} von ${scroll.scrollWidth - scroll.clientWidth}`;
  });
  console.log(`${name}: nach dem Ziehen verschoben auf ${stand}`);
}

(async () => {
  const browser = await chromium.launch();
  for (const { name, viewport, pixeldichte } of GERAETE) {
    const seite = await browser.newPage({ viewport, deviceScaleFactor: pixeldichte });
    const fehler = [];
    seite.on("pageerror", (e) => fehler.push(e.message));
    await seite.goto(ADRESSE);
    await seite.waitForTimeout(3500);
    await fotografiereEcken(seite, `ecke-${name}-auf`);
    await ziehGriff(seite, name);
    await seite.click(".zlKlapp");
    await seite.waitForTimeout(400);
    await fotografiereEcken(seite, `ecke-${name}-zu`);
    console.log(`== ${name}: ${fehler.length ? fehler.join("\n   ") : "keine Fehler"}`);
    await seite.close();
  }
  await browser.close();
})();
