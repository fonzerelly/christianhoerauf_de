// Macht Screenshots der Besucherfassung (live/index.html) für mehrere Zufalls-Startwerte,
// einmal als Handy und einmal als Desktop, an mehreren Stellen der Begrüßungs-Animation.
// Dazu entsteht eine Übersichtsseite index.html, die alle Bilder nebeneinander zeigt.
//
// Aufruf im Ordner prototypes/06-frage-antwort:
//   node werkzeuge/screenshots.js            Startwerte 1 bis 10
//   node werkzeuge/screenshots.js 3 17 42    nur diese Startwerte
//
// Ergebnis: docs/screenshots/prototyp-6-seeds/ (alte Bilder dort werden vorher gelöscht).
//
// Braucht nur Node und Google Chrome. Chrome läuft unsichtbar (headless) und wird über das
// DevTools-Protokoll ferngesteuert - dasselbe, das die Entwicklertools des Browsers nutzen.
// Das Handy wird wie im Gerätemodus der Entwicklertools nachgeahmt: schmales Fenster,
// Pixeldichte 3, Touch, iPhone-Kennung. Die Seite wählt ihr Profil dann selbst.
//
// Die Bilder entstehen in echter Zeit, während die Animation läuft. Der Anteil des Wegs,
// bei dem ein Bild tatsächlich entstand, kann deshalb etwas über dem Zielwert liegen; die
// Übersichtsseite zeigt den tatsächlichen Wert.

const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { spawn } = require("node:child_process");

const PROJECT_DIR = path.join(__dirname, "..", "..", "..");
const LIVE_PAGE = path.join(PROJECT_DIR, "live", "index.html");
const OUTPUT_DIR = path.join(PROJECT_DIR, "docs", "screenshots", "prototyp-6-seeds");
const DEFAULT_SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

const DEVICES = {
  handy: {
    metrics: { width: 390, height: 844, deviceScaleFactor: 3, mobile: true },
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 " +
      "(KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    touch: true,
    // gerendert wird mit Pixeldichte 3, gespeichert mit 2 - spart rund die Hälfte Platz
    imageScale: 2 / 3,
  },
  desktop: {
    metrics: { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false },
    userAgent: null,
    touch: false,
    imageScale: 1,
  },
};

// Bei diesen Anteilen des Wegs auf jeder Labyrinth-Seite entsteht ein Bild.
const FRACTIONS_PER_PAGE = [0.2, 0.5, 0.8];
// So viele Chrome-Fenster laufen gleichzeitig (je Gerät die Hälfte der Startwerte).
const BROWSERS_PER_DEVICE = 2;
const LONGEST_RUN_MILLIS = 3 * 60 * 1000;
const JPEG_QUALITY = 85;

const sleep = (millis) => new Promise((resolve) => setTimeout(resolve, millis));

// ---------------------------------------------------------------------------
// Chrome fernsteuern
// ---------------------------------------------------------------------------

// Startet ein unsichtbares Chrome mit eigenem, leerem Profil und wartet auf seinen Debug-Port.
async function startChrome() {
  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), "chrome-screenshots-"));
  const chrome = spawn("google-chrome", [
    "--headless=new", "--remote-debugging-port=0", `--user-data-dir=${profileDir}`,
    "--no-first-run", "--hide-scrollbars", "about:blank",
  ], { stdio: "ignore" });

  // Chrome schreibt den gewählten Port in diese Datei, sobald er bereit ist.
  const portFile = path.join(profileDir, "DevToolsActivePort");
  const portIsKnown = () => fs.existsSync(portFile) && fs.readFileSync(portFile, "utf8").trim() !== "";
  for (let tries = 0; !portIsKnown(); tries++) {
    if (tries > 100) throw new Error("Chrome meldet keinen Debug-Port.");
    await sleep(100);
  }
  const port = fs.readFileSync(portFile, "utf8").split("\n")[0];

  const stop = () => {
    chrome.kill();
    fs.rmSync(profileDir, { recursive: true, force: true });
  };
  return { port, stop };
}

// Öffnet einen neuen Tab und verbindet sich mit ihm.
// Liefert send(methode, parameter) -> Antwort, die gesammelten Fehler der Seite und close().
async function openTab(port) {
  const response = await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" });
  const tab = await response.json();
  const socket = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });

  let nextId = 1;
  const waitingForAnswer = new Map();
  const pageErrors = [];

  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id && waitingForAnswer.has(message.id)) {
      const { resolve, reject } = waitingForAnswer.get(message.id);
      waitingForAnswer.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    }
    if (message.method === "Runtime.exceptionThrown") {
      pageErrors.push(message.params.exceptionDetails.text);
    }
    if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") {
      pageErrors.push(message.params.args.map((arg) => arg.value).join(" "));
    }
  };

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = nextId++;
      waitingForAnswer.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });

  return { send, pageErrors, close: () => socket.close() };
}

// Wertet einen Ausdruck in der Seite aus und liefert das Ergebnis.
async function evaluate(tab, expression) {
  const result = await tab.send("Runtime.evaluate", { expression, returnByValue: true });
  if (result.exceptionDetails) throw new Error(`${result.exceptionDetails.text}: ${expression}`);
  return result.result.value;
}

// Der Zustand der Animation, gelesen aus den Variablen von seite.js.
const ANIMATION_STATE = `({
  phase: scene.phase,
  pageIndex: scene.pageIndex,
  pageCount: scene.pages.length,
  fraction: scene.progress / (currentPage().route.length - 1),
  cols: scene.cols,
  rows: scene.rows,
  profile: document.body.dataset.profile,
  seed: currentSettings.seed,
  scrollSeconds: currentSettings.scrollSeconds,
  walkingSeconds: Math.round(walkingSecondsOfAllPages(currentSettings)),
})`;

// Wartet, bis die Seite geladen ist und die Animation läuft, und liefert deren Zustand.
async function waitForAnimation(tab) {
  for (let tries = 0; ; tries++) {
    await sleep(100);
    try {
      return await evaluate(tab, ANIMATION_STATE);
    } catch (error) {
      if (tries > 50) throw error;
    }
  }
}

// ---------------------------------------------------------------------------
// Ein Durchlauf: ein Gerät, ein Startwert
// ---------------------------------------------------------------------------

function imageNameOf(deviceName, seed, number, moment) {
  const twoDigits = (value) => String(value).padStart(2, "0");
  return `${deviceName}-seed${twoDigits(seed)}-${twoDigits(number)}-${moment}.jpg`;
}

// Öffnet die Seite als Handy oder Desktop mit ?seed=…, lässt die Begrüßung durchlaufen und
// macht dabei die Bilder. Liefert die Angaben zum Durchlauf samt Liste der Bilder.
async function photographRun(port, deviceName, seed) {
  const device = DEVICES[deviceName];
  const tab = await openTab(port);
  await tab.send("Runtime.enable");
  await tab.send("Page.enable");
  await tab.send("Emulation.setDeviceMetricsOverride", device.metrics);
  if (device.userAgent) await tab.send("Emulation.setUserAgentOverride", { userAgent: device.userAgent });
  if (device.touch) await tab.send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  await tab.send("Page.navigate", { url: `file://${LIVE_PAGE}?seed=${seed}` });

  let state = await waitForAnimation(tab);
  const run = {
    device: deviceName,
    seed: state.seed,
    profile: state.profile,
    cols: state.cols,
    rows: state.rows,
    pageCount: state.pageCount,
    walkingSeconds: state.walkingSeconds,
    images: [],
  };

  // Ganzer Bildschirm, beim Handy verkleinert. Chrome multipliziert scale selbst noch mit
  // der Pixeldichte: 390 px × Pixeldichte 3 × 2/3 = 780 px breit.
  const clip = { x: 0, y: 0, width: device.metrics.width, height: device.metrics.height,
    scale: device.imageScale };

  const takePicture = async (moment, description) => {
    const fileName = imageNameOf(deviceName, seed, run.images.length + 1, moment);
    const { data } = await tab.send("Page.captureScreenshot", {
      format: "jpeg", quality: JPEG_QUALITY, clip, captureBeyondViewport: false,
    });
    fs.writeFileSync(path.join(OUTPUT_DIR, fileName), Buffer.from(data, "base64"));
    run.images.push({ file: fileName, description });
  };

  const alreadyTaken = new Set();
  const isNew = (key) => !alreadyTaken.has(key) && alreadyTaken.add(key);
  const startedAt = Date.now();

  while (Date.now() - startedAt < LONGEST_RUN_MILLIS) {
    state = await evaluate(tab, ANIMATION_STATE);
    const page = state.pageIndex + 1;
    const pageOf = `Seite ${page} von ${state.pageCount}`;

    if (state.phase === "writing") {
      const target = FRACTIONS_PER_PAGE.find((fraction) => state.fraction >= fraction && !alreadyTaken.has(`${page}-${fraction}`));
      if (target !== undefined) {
        isNew(`${page}-${target}`);
        const percent = Math.round(target * 100);
        await takePicture(`seite${page}-weg${percent}`, `${pageOf}, ${Math.round(state.fraction * 100)} % des Wegs`);
      }
    }
    if (state.phase === "fading" && isNew(`${page}-draussen`)) {
      await takePicture(`seite${page}-punkt-draussen`, `${pageOf}, Punkt hinausgelaufen, Spur verglimmt`);
    }
    if (state.phase === "scrolling" && isNew(`${page}-schieben`)) {
      await sleep((state.scrollSeconds * 1000) / 2); // etwa in der Mitte des Weiterschiebens
      await takePicture(`weiterschieben-nach-seite${page}`, `Weiterschieben nach Seite ${page}`);
    }
    if (state.phase === "finished") {
      await takePicture("ende", "Ende: Spur verglommen, wartet auf eine Frage");
      break;
    }
    await sleep(40);
  }

  run.pageErrors = tab.pageErrors;
  run.seconds = Math.round((Date.now() - startedAt) / 1000);
  tab.close();
  return run;
}

// Ein Chrome arbeitet mehrere Startwerte nacheinander ab.
async function photographSeeds(deviceName, seeds) {
  const chrome = await startChrome();
  const runs = [];
  try {
    for (const seed of seeds) {
      const run = await photographRun(chrome.port, deviceName, seed);
      console.log(
        `${deviceName} seed ${seed}: ${run.cols}×${run.rows}, ${run.pageCount} Seite(n), ` +
        `${run.images.length} Bilder, ${run.seconds} s, Fehler der Seite: ${run.pageErrors.length}`
      );
      runs.push(run);
    }
  } finally {
    chrome.stop();
  }
  return runs;
}

// Verteilt die Startwerte reihum auf `count` Gruppen.
function splitIntoGroups(list, count) {
  const groups = Array.from({ length: count }, () => []);
  list.forEach((item, index) => groups[index % count].push(item));
  return groups.filter((group) => group.length > 0);
}

// ---------------------------------------------------------------------------
// Übersichtsseite
// ---------------------------------------------------------------------------

function escapeHtml(text) {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Ein Startwert als Zeile: Kopf mit den Eckdaten, darunter alle Bilder in zeitlicher Folge.
function runAsHtml(run) {
  const errors = run.pageErrors.length === 0
    ? "keine Fehler in der Konsole"
    : `<strong>${run.pageErrors.length} Fehler:</strong> ${escapeHtml(run.pageErrors.join(" | "))}`;
  const pictures = run.images.map((image) => `
      <figure>
        <a href="${image.file}"><img src="${image.file}" loading="lazy" alt="${escapeHtml(image.description)}"></a>
        <figcaption>${escapeHtml(image.description)}</figcaption>
      </figure>`).join("");

  return `
    <section>
      <h3>Seed ${run.seed} · ${run.cols} × ${run.rows} Zellen · ${run.pageCount} Seite(n) ·
        ca. ${run.walkingSeconds} s Laufzeit · ${errors}</h3>
      <p class="url">live/index.html?seed=${run.seed}</p>
      <div class="strip ${run.device}">${pictures}
      </div>
    </section>`;
}

function writeOverviewPage(runs) {
  const deviceSection = (deviceName, heading) => {
    const metrics = DEVICES[deviceName].metrics;
    const runsOfDevice = runs.filter((run) => run.device === deviceName).sort((a, b) => a.seed - b.seed);
    return `
  <h2>${heading} (${metrics.width} × ${metrics.height}, Pixeldichte ${metrics.deviceScaleFactor},
    Profil „${runsOfDevice[0]?.profile ?? "?"}“)</h2>
  ${runsOfDevice.map(runAsHtml).join("")}`;
  };

  const html = `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Prototyp 6 – Startwerte</title>
  <style>
    body { margin: 0; padding: 16px; background: #03140a; color: #b8f5c8; font: 14px/1.4 monospace; }
    h1, h2 { color: #2bdc5a; }
    h3 { font-size: 14px; margin: 24px 0 2px; }
    .url { margin: 0 0 8px; opacity: 0.7; }
    .strip { display: flex; gap: 8px; overflow-x: auto; padding-bottom: 8px; }
    figure { margin: 0; flex: none; }
    .handy img { height: 420px; }
    .desktop img { height: 260px; }
    img { display: block; border: 1px solid #1d5c33; }
    figcaption { max-width: 200px; font-size: 12px; opacity: 0.8; margin-top: 4px; }
  </style>
</head>
<body>
  <h1>Prototyp 6 – Begrüßung mit verschiedenen Startwerten</h1>
  <p>Erzeugt am ${new Date().toLocaleString("de-DE")} mit <code>node werkzeuge/screenshots.js</code>
    (im Ordner prototypes/06-frage-antwort). Bild anklicken für volle Größe.</p>
  ${deviceSection("handy", "Handy, wie im Gerätemodus des Browsers")}
  ${deviceSection("desktop", "Desktop")}
</body>
</html>
`;
  fs.writeFileSync(path.join(OUTPUT_DIR, "index.html"), html);
}

// Löscht die Bilder eines früheren Durchlaufs, damit keine veralteten liegen bleiben.
function clearOldImages() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  for (const fileName of fs.readdirSync(OUTPUT_DIR)) {
    if (fileName.endsWith(".jpg")) fs.rmSync(path.join(OUTPUT_DIR, fileName));
  }
}

async function main() {
  const wishedSeeds = process.argv.slice(2).map(Number);
  const seeds = wishedSeeds.length > 0 ? wishedSeeds : DEFAULT_SEEDS;
  clearOldImages();

  const jobs = [];
  for (const deviceName of Object.keys(DEVICES)) {
    for (const group of splitIntoGroups(seeds, BROWSERS_PER_DEVICE)) {
      jobs.push(photographSeeds(deviceName, group));
    }
  }
  const runs = (await Promise.all(jobs)).flat();

  writeOverviewPage(runs);
  console.log(`Fertig: ${path.join(OUTPUT_DIR, "index.html")}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
