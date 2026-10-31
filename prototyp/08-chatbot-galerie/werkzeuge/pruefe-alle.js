// Lädt jeden Prototyp in Chrome, stellt eine Frage, sammelt JS-Fehler und macht ein
// Vorschaubild (vorschau/NN.jpg, 640×400) für die Galerie.
// Start: node werkzeuge/pruefe-alle.js [nummern …]   z. B. node werkzeuge/pruefe-alle.js 09 14
// Braucht playwright-core aus frontend/node_modules und Google Chrome unter /usr/bin.
const fs = require("fs"), path = require("path");
const { chromium } = require(path.join(__dirname, "../../../frontend/node_modules/playwright-core"));
const GALERIE = path.join(__dirname, "..");
const nurDiese = process.argv.slice(2);
(async () => {
  const browser = await chromium.launch({ executablePath: "/usr/bin/google-chrome", args: ["--autoplay-policy=no-user-gesture-required"] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 0.5 });
  fs.mkdirSync(path.join(GALERIE, "vorschau"), { recursive: true });
  const ordner = fs.readdirSync(GALERIE).filter((d) => /^\d\d-/.test(d)).filter((d) => !nurDiese.length || nurDiese.some((n) => d.startsWith(n))).sort();
  for (const d of ordner) {
    const page = await ctx.newPage();
    const fehler = [];
    page.on("pageerror", (e) => fehler.push("pageerror: " + e.message));
    page.on("console", (m) => m.type() === "error" && fehler.push("console: " + m.text()));
    await page.goto("file://" + path.join(GALERIE, d, "index.html"));
    await page.waitForTimeout(600);
    const besonders = {
      "23": async () => { await page.fill("#eingabe", "nimm namensschild"); await page.press("#eingabe", "Enter"); await page.fill("#eingabe", "frage chris wer bist du"); await page.press("#eingabe", "Enter"); },
      "36": async () => { await page.click("#anrufen"); await page.click("#tasten button:nth-child(2)"); },
      "40": async () => { await page.click(".halt >> nth=3"); },
      "45": async () => { await page.click("#ziehen"); await page.waitForTimeout(5200); await page.fill("#eingabe", "Wer bist du?"); await page.press("#eingabe", "Enter"); },
      "11": async () => { await page.keyboard.press("Control+k"); await page.fill("#eingabe", "Wer bist du?"); await page.press("#eingabe", "Enter"); },
      "17": async () => {},
      "44": async () => { for (const i of [0, 2, 5]) await page.click(".kachel >> nth=" + i); await page.click("#pruefen"); },
      "12": async () => { await page.fill("#betreff", "Wer bist du?"); await page.click("#formular button"); },
      "43": async () => { await page.check("[name=rolle] >> nth=0"); await page.selectOption("#art", { index: 1 }); await page.check("#wahr"); await page.check("#kaffee"); await page.click(".absenden"); },
      "50": async () => { await page.focus("#eingabe"); await page.fill("#eingabe", "Wer bist du?"); await page.press("#eingabe", "Enter"); },
    };
    try {
      const nr = d.slice(0, 2);
      if (besonders[nr]) await besonders[nr]();
      else {
        const input = page.locator("input:visible").first();
        if (await input.count()) { await input.fill("Wer bist du?"); await input.press("Enter"); }
      }
    } catch (e) { fehler.push("bedienung: " + e.message.split("\n")[0]); }
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(GALERIE, "vorschau", d.slice(0, 2) + ".jpg"), type: "jpeg", quality: 72 });
    const text = (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, " ");
    const hatAntwort = text.includes("ChrisBot, der Chatbot") || text.toUpperCase().includes("ICH BIN CHRISBOT, DER CHATBOT") || text.includes("Lorem") || text.toUpperCase().includes("LOREM");
    console.log((fehler.length ? "FEHLER " : "ok     ") + d + (hatAntwort ? "" : "  (kein Antworttext im DOM)") + (fehler.length ? "\n   " + fehler.join("\n   ") : ""));
    await page.close();
  }
  await browser.close();
})();
