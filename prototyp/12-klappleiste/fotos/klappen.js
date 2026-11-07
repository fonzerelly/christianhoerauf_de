// Der Übergang beim Zu- und Aufklappen in Einzelbildern, auf Desktop und Handy.
// Die Animationen laufen in Zeitlupe, die Bilder entstehen währenddessen; im Dateinamen steht,
// wie weit der Übergang beim Foto war (…-02-031.png: zweites Bild, 31 %).
// Angehaltene und von Hand verstellte Animationen taugen dafür nicht: Chromium zeichnet sie dann
// teils mit falscher Schrift und alten Zwischenständen.
// Aufruf über ../fotografiere.sh klappen
// Firefox statt Chromium: Chromium im Container zeichnet bewegte Texte mit einer anderen Schrift,
// als es zum Messen nimmt; die Texte wirken dann breiter und überlappen (geprüft 07.11.2026).
const { firefox } = require("playwright-core");
const ADRESSE = "file:///repo/prototyp/12-klappleiste/index.html#NDcxMXxGcmF1IEVyaWthIE11c3RlcnxlOWJk";
const AUSGABE = "/ausgabe";
const ZEITLUPE = 0.1; // ein Zehntel der Geschwindigkeit: 450 ms werden 4,5 s
const BILDER = 6;
const ABSTAND = 700; // Millisekunden zwischen zwei Fotos

const GERAETE = [
  { name: "desktop", viewport: { width: 1440, height: 900 } },
  { name: "handy", viewport: { width: 390, height: 844 } },
];

// Klickt den Klappknopf und lässt alle Animationen in Zeitlupe laufen.
async function klappeInZeitlupe(seite) {
  return seite.evaluate((zeitlupe) => {
    document.querySelector(".zlKlapp").click();
    const animationen = document.getAnimations();
    animationen.forEach((animation) => (animation.playbackRate = zeitlupe));
    return animationen.length;
  }, ZEITLUPE);
}

// Wie weit der Übergang gerade ist (0–100), gemessen an der ersten seiner Animationen.
async function fortschritt(seite) {
  return seite.evaluate(() => {
    const animation = document.getAnimations().find((a) => a.effect.getComputedTiming().duration === 450);
    return animation ? Math.round(animation.effect.getComputedTiming().progress * 100) : 100;
  });
}

// Fotografiert den Streifen von der Unterkante der Bühne bis etwas unter die Zeitleiste.
async function foto(seite, datei) {
  const box = await seite.evaluate(() => {
    const buehne = document.getElementById("stage").getBoundingClientRect();
    return { x: 0, y: buehne.bottom - 10 + window.scrollY, width: document.documentElement.clientWidth };
  });
  await seite.screenshot({ path: `${AUSGABE}/${datei}`, clip: { ...box, height: 260 }, fullPage: true });
}

async function zeigeUebergang(seite, praefix) {
  const anzahl = await klappeInZeitlupe(seite);
  for (let bild = 0; bild < BILDER; bild++) {
    const prozent = await fortschritt(seite);
    await foto(seite, `${praefix}-${String(bild + 1).padStart(2, "0")}-${String(prozent).padStart(3, "0")}.png`);
    await seite.waitForTimeout(ABSTAND);
  }
  await seite.waitForTimeout(1500);
  return anzahl;
}

(async () => {
  const browser = await firefox.launch();
  for (const { name, viewport } of GERAETE) {
    const seite = await browser.newPage({ viewport, deviceScaleFactor: 1 });
    const fehler = [];
    seite.on("pageerror", (e) => fehler.push(e.message));
    await seite.goto(ADRESSE);
    await seite.waitForTimeout(3500);
    const zu = await zeigeUebergang(seite, `klappen-${name}-zu`);
    const auf = await zeigeUebergang(seite, `klappen-${name}-auf`);
    const rest = await seite.evaluate(() => document.querySelectorAll(".zlUebergang").length);
    console.log(`${name}: ${zu} Animationen beim Zuklappen, ${auf} beim Aufklappen, danach übrige Ebenen: ${rest}`);
    console.log(`== ${name}: ${fehler.length ? fehler.join("\n   ") : "keine Fehler"}`);
    await seite.close();
  }
  await browser.close();
})();
