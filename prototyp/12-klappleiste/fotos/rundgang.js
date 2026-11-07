// Rundgang durch Prototyp 12 auf Desktop (1440 × 900) und Handy (390 × 844): Begrüßung,
// Stationsmenü, Einstiegsfrage, Antwort, Auf- und Zuklappen, Höhen 10 und 18 Reihen.
// Gibt Bühnenhöhen, Breiten (Labyrinth, Zeitleiste, Fragefeld) und Konsolenfehler aus.
// Aufruf über ../fotografiere.sh rundgang
const { chromium } = require("playwright-core");
const ADRESSE = "file:///repo/prototyp/12-klappleiste/index.html";
const AUSGABE = "/ausgabe";
const MUSTER = "#NDcxMXxGcmF1IEVyaWthIE11c3RlcnxlOWJk";

async function lauf(browser, name, viewport, schritte) {
  const seite = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  const fehler = [];
  seite.on("pageerror", (e) => fehler.push("pageerror: " + e.message));
  seite.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") { if (!/CORS|ERR_FAILED/.test(m.text())) fehler.push(m.type() + ": " + m.text()); } });
  await schritte(seite);
  console.log(`== ${name}: ${fehler.length ? fehler.join("\n   ") : "keine Fehler"}`);
  await seite.close();
}
async function breiten(seite) {
  return seite.evaluate(() => {
    const r = (sel) => { const b = document.querySelector(sel).getBoundingClientRect(); return Math.round(b.left) + "–" + Math.round(b.right); };
    const st = document.getElementById("stage").getBoundingClientRect();
    const v = getComputedStyle(document.getElementById("seite"));
    const links = st.left + parseFloat(v.getPropertyValue("--labyrinth-links"));
    const lab = Math.round(links) + "–" + Math.round(links + parseFloat(v.getPropertyValue("--labyrinth-breite")));
    const eng = [...document.querySelectorAll(".zlEngagement button")].map((k) => k.textContent + " [" + k.offsetWidth + "/" + k.scrollWidth + "]");
    return { labyrinth: lab, zeitleiste: r(".zlRahmen"), fragefeld: r("#askForm"), engagements: eng };
  });
}
async function hoehe(seite) { return seite.evaluate(() => document.getElementById("stage").offsetHeight); }

(async () => {
  const browser = await chromium.launch();
  await lauf(browser, "desktop", { width: 1440, height: 900 }, async (seite) => {
    await seite.goto(ADRESSE + MUSTER);
    await seite.waitForTimeout(4000);
    console.log("Bühne auf:", await hoehe(seite), JSON.stringify(await breiten(seite), null, 1));
    await seite.screenshot({ path: `${AUSGABE}/d1-auf.png` });
    await seite.click(".zlStation >> nth=-2 >> button");
    await seite.waitForTimeout(300);
    await seite.screenshot({ path: `${AUSGABE}/d2-menue.png` });
    await seite.click("#stationsMenue li >> nth=1 >> button");
    await seite.waitForTimeout(400);
    console.log("Fragefeld:", await seite.inputValue("#question"), "| Fokus:", await seite.evaluate(() => document.activeElement.id));
    await seite.screenshot({ path: `${AUSGABE}/d3-zu-nach-menue.png` });
    await seite.press("#question", "Enter");
    await seite.waitForTimeout(3500);
    console.log("Bühne zu:", await hoehe(seite));
    await seite.screenshot({ path: `${AUSGABE}/d4-antwort.png` });
    await seite.click(".zlZeile button >> nth=5");
    await seite.waitForTimeout(300);
    await seite.screenshot({ path: `${AUSGABE}/d5-menue-zu.png` });
    await seite.keyboard.press("Escape");
    await seite.click(".zlKlapp");
    await seite.waitForTimeout(600);
    await seite.screenshot({ path: `${AUSGABE}/d6-wieder-auf.png` });
    await seite.evaluate(() => document.querySelector(".zlScroll").scrollLeft = 0);
    await seite.waitForTimeout(200);
    await seite.screenshot({ path: `${AUSGABE}/d7-links.png` });
    for (const r of ["10", "18"]) {
      await seite.evaluate((r) => { const f = document.getElementById("p12Reihen"); f.value = r; f.dispatchEvent(new Event("input")); }, r);
      await seite.waitForTimeout(2500);
      console.log("Reihen", r, "Bühne:", await hoehe(seite));
      await seite.screenshot({ path: `${AUSGABE}/d8-reihen${r}.png` });
    }
  });
  await lauf(browser, "handy", { width: 390, height: 844 }, async (seite) => {
    await seite.goto(ADRESSE + MUSTER);
    await seite.waitForTimeout(4000);
    console.log(JSON.stringify(await breiten(seite), null, 1));
    await seite.screenshot({ path: `${AUSGABE}/h1-auf.png`, fullPage: true });
    await seite.click(".zlStation >> nth=-1 >> button");
    await seite.waitForTimeout(300);
    await seite.screenshot({ path: `${AUSGABE}/h2-menue.png`, fullPage: true });
    await seite.click("#stationsMenue li >> nth=0 >> button");
    await seite.press("#question", "Enter");
    await seite.waitForTimeout(3500);
    await seite.screenshot({ path: `${AUSGABE}/h3-antwort.png`, fullPage: true });
  });
  await browser.close();
})();
