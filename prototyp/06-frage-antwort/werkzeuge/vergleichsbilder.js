// Macht Vergleichsbilder vom Prototyp 6 für den Neubau unter frontend/, je als Handy und
// als Desktop:
//
//   frage           Besucherfassung: Begrüßung abwarten, Frage stellen, Antwort schreiben lassen
//   schnelldurchlauf Besucherfassung: Frage mitten in der Begrüßung, der Rest läuft im
//                   Schnelldurchlauf hinaus, dann kommt die Antwort
//   zeichensatz     Prototyp-Fassung: der ganze Zeichensatz über "=TEXT", ein Bild nach je
//                   zwei fertigen Glyphen (die Leuchtspur zeigt nur die letzten ein, zwei)
//
// Aufruf im Ordner prototyp/06-frage-antwort:
//   node werkzeuge/vergleichsbilder.js
//
// Ergebnis: docs/prototyp/screenshots/prototyp-6-vergleich/ mit Übersichtsseite index.html
// (alte Bilder dort werden vorher gelöscht).
//
// Das Werkzeug liest nur. config.js bleibt unverändert; in der Prototyp-Fassung wird
// lediglich die Regler-Leiste zugeklappt, damit die Bühne so groß ist wie bei Besuchern.

const fs = require("node:fs");
const path = require("node:path");
const {
  PROJECT_DIR, DEVICES, sleep, startChrome, evaluate, waitForAnimation, openDeviceTab, cameraFor, escapeHtml,
} = require("./screenshots.js");

const LIVE_PAGE = path.join(PROJECT_DIR, "prototyp", "live", "index.html");
const PROTOTYPE_PAGE = path.join(PROJECT_DIR, "prototyp", "06-frage-antwort", "index.html");
const OUTPUT_DIR = path.join(PROJECT_DIR, "docs", "prototyp", "screenshots", "prototyp-6-vergleich");

const SEED = 1;
const QUESTION = "Wer bist du?";
// Der ganze Zeichensatz des Prototyps. In Wörter geteilt, damit die Zeilen auch am Handy
// ohne Trennstrich auskommen.
const CHARACTER_SET = "ABCDEF GHIJKL MNOPQR STUVWX YZ ÄÖÜ 01234 56789 -.?";
const GLYPHS_PER_PICTURE = 2;
const FRACTIONS_PER_PAGE = [0.2, 0.5, 0.8];
const RUSH_PICTURES = 3;
const LONGEST_SCENE_MILLIS = 4 * 60 * 1000;

// Der Zustand der Animation, gelesen aus den Variablen von seite.js. glyphEnds: an diesen
// Stellen der Route ist jeweils eine Glyphe fertig (das letzte Schrift- oder Sprung-Wegstück
// vor einem Verbindungsweg). glyphs: die Zeichen der Seite in derselben Reihenfolge.
const SCENE_STATE = `(() => {
  const page = currentPage();
  const isGlyphStep = (step) => step && step.kind !== CONNECTOR;
  const glyphEnds = [];
  page.route.forEach((step, index) => {
    const next = page.route[index + 1];
    if (index > 0 && isGlyphStep(step) && !isGlyphStep(next)) glyphEnds.push(index);
  });
  return {
    phase: scene.phase,
    progress: scene.progress,
    fraction: scene.progress / (page.route.length - 1),
    pageNumber: page.numberInAnswer,
    pageCount: page.answer.pageCount,
    isOldAnswer: isSuperseded(page),
    glyphEnds,
    glyphs: page.lines.join("").replace(/ /g, ""),
    scrollSeconds: currentSettings.scrollSeconds,
    cols: scene.cols,
    rows: scene.rows,
    profile: document.body.dataset.profile,
  };
})()`;

// Tippt eine Frage ins Fragefeld und schickt sie ab, wie ein Besucher mit Enter.
async function ask(tab, question) {
  await evaluate(tab, `document.getElementById("question").value = ${JSON.stringify(question)}`);
  await evaluate(tab, `document.getElementById("askForm").requestSubmit()`);
}

// Ruft onState(zustand) immer wieder auf, bis es true liefert. Wirft nach LONGEST_SCENE_MILLIS.
async function waitFor(tab, onState) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < LONGEST_SCENE_MILLIS) {
    if (await onState(await evaluate(tab, SCENE_STATE))) return;
    await sleep(20);
  }
  throw new Error("Die Animation ist nicht rechtzeitig fertig geworden.");
}

// Begleitet die neue Antwort bis zum Ende und macht die üblichen Bilder: bei 20, 50 und
// 80 % des Wegs jeder Seite, Punkt draußen, Weiterschieben, Ende.
async function photographAnswer(tab, takePicture) {
  const alreadyTaken = new Set();
  const isNew = (key) => !alreadyTaken.has(key) && alreadyTaken.add(key);

  await waitFor(tab, async (state) => {
    if (state.isOldAnswer) return false;
    const page = state.pageNumber;
    const pageOf = `Antwort Seite ${page} von ${state.pageCount}`;

    if (state.phase === "writing") {
      const target = FRACTIONS_PER_PAGE.find((fraction) => state.fraction >= fraction && !alreadyTaken.has(`${page}-${fraction}`));
      if (target !== undefined) {
        isNew(`${page}-${target}`);
        await takePicture(`antwort-seite${page}-weg${Math.round(target * 100)}`,
          `${pageOf}, ${Math.round(state.fraction * 100)} % des Wegs`);
      }
    }
    if (state.phase === "fading" && isNew(`${page}-draussen`)) {
      await takePicture(`antwort-seite${page}-punkt-draussen`, `${pageOf}, Punkt hinausgelaufen`);
    }
    if (state.phase === "scrolling" && isNew(`${page}-schieben`)) {
      await sleep((state.scrollSeconds * 1000) / 2);
      await takePicture(`antwort-weiterschieben-seite${page}`, `Weiterschieben zur Antwort, Seite ${page}`);
    }
    if (state.phase === "finished") {
      await takePicture("ende", "Ende: Spur verglommen, wartet auf die nächste Frage");
      return true;
    }
    return false;
  });
}

// Szene "frage": Begrüßung zu Ende laufen lassen, dann eine Frage stellen.
async function sceneQuestion(tab, takePicture) {
  await waitFor(tab, (state) => state.phase === "finished");
  await takePicture("begruessung-fertig", "Begrüßung fertig, wartet auf eine Frage");
  await evaluate(tab, `document.getElementById("question").value = ${JSON.stringify(QUESTION)}`);
  await takePicture("frage-eingetippt", `Frage „${QUESTION}“ eingetippt`);
  await evaluate(tab, `document.getElementById("askForm").requestSubmit()`);
  await photographAnswer(tab, takePicture);
}

// Szene "schnelldurchlauf": Frage, wenn die Begrüßung auf Seite 1 halb geschrieben ist.
async function sceneRush(tab, takePicture) {
  await waitFor(tab, (state) => state.phase === "writing" && state.pageNumber === 1 && state.fraction >= 0.5);
  await takePicture("begruessung-halb", "Begrüßung, Seite 1 zur Hälfte geschrieben");
  await ask(tab, QUESTION);

  let rushPictures = 0;
  await waitFor(tab, async (state) => {
    // Schluss, sobald die alte Seite hinausgelaufen ist
    if (!state.isOldAnswer || state.phase !== "writing") return true;
    rushPictures++;
    await takePicture(`schnelldurchlauf-${rushPictures}`,
      `Schnelldurchlauf der Begrüßung, ${Math.round(state.fraction * 100)} % des Wegs`);
    await sleep(150);
    return rushPictures >= RUSH_PICTURES;
  });
  await photographAnswer(tab, takePicture);
}

// Szene "zeichensatz": Regler-Leiste zu, Zeichensatz schreiben lassen, nach je zwei fertigen
// Glyphen ein Bild.
async function sceneCharacterSet(tab, takePicture) {
  await waitForAnimation(tab);
  await evaluate(tab, "setControlsOpen(false)");
  await sleep(1500); // die Bühne wird größer; seite.js baut das Labyrinth danach neu auf
  await ask(tab, `=${CHARACTER_SET}`);

  const photographedGlyphs = new Set();
  await waitFor(tab, async (state) => {
    if (state.isOldAnswer) return false;
    if (state.phase === "finished") return true;
    if (state.phase !== "writing") return false;

    const finishedGlyphs = state.glyphEnds.filter((end) => end <= state.progress).length;
    const isLastGlyph = finishedGlyphs === state.glyphEnds.length;
    const isDue = finishedGlyphs > 0 && (finishedGlyphs % GLYPHS_PER_PICTURE === 0 || isLastGlyph);
    const key = `${state.pageNumber}-${finishedGlyphs}`;
    if (isDue && !photographedGlyphs.has(key)) {
      photographedGlyphs.add(key);
      const first = Math.max(0, finishedGlyphs - GLYPHS_PER_PICTURE);
      const characters = state.glyphs.slice(first, finishedGlyphs);
      await takePicture(`seite${state.pageNumber}-glyphen-${String(finishedGlyphs).padStart(2, "0")}`,
        `Seite ${state.pageNumber} von ${state.pageCount}: „${characters}“ fertig`);
    }
    return false;
  });
}

const SCENES = [
  { name: "frage", title: `Frage „${QUESTION}“ nach der Begrüßung`, page: LIVE_PAGE, play: sceneQuestion },
  { name: "schnelldurchlauf", title: "Frage mitten in der Begrüßung (Schnelldurchlauf)", page: LIVE_PAGE, play: sceneRush },
  { name: "zeichensatz", title: `Zeichensatz „${CHARACTER_SET}“`, page: PROTOTYPE_PAGE, play: sceneCharacterSet },
];

// Spielt eine Szene auf einem Gerät durch. Liefert die Angaben samt Liste der Bilder.
async function photographScene(port, deviceName, scene) {
  const url = `file://${scene.page}?seed=${SEED}`;
  const tab = await openDeviceTab(port, deviceName, url);
  const savePicture = cameraFor(tab, deviceName, OUTPUT_DIR);
  const run = { device: deviceName, scene, images: [] };

  const takePicture = async (moment, description) => {
    const number = String(run.images.length + 1).padStart(2, "0");
    const fileName = `${deviceName}-${scene.name}-${number}-${moment}.jpg`;
    await savePicture(fileName);
    run.images.push({ file: fileName, description });
  };

  const startedAt = Date.now();
  await scene.play(tab, takePicture);
  const state = await evaluate(tab, SCENE_STATE);
  Object.assign(run, { cols: state.cols, rows: state.rows, profile: state.profile, pageErrors: tab.pageErrors });
  run.seconds = Math.round((Date.now() - startedAt) / 1000);
  tab.close();
  return run;
}

// Ein Chrome spielt alle Szenen für ein Gerät nacheinander durch.
async function photographDevice(deviceName) {
  const chrome = await startChrome();
  const runs = [];
  try {
    for (const scene of SCENES) {
      const run = await photographScene(chrome.port, deviceName, scene);
      console.log(`${deviceName} ${scene.name}: ${run.images.length} Bilder, ${run.seconds} s, ` +
        `Fehler der Seite: ${run.pageErrors.length}`);
      runs.push(run);
    }
  } finally {
    chrome.stop();
  }
  return runs;
}

function runAsHtml(run) {
  const errors = run.pageErrors.length === 0
    ? "keine Fehler in der Konsole"
    : `<strong>${run.pageErrors.length} Fehler:</strong> ${escapeHtml(run.pageErrors.join(" | "))}`;
  const pictures = run.images.map((image) => `
      <figure>
        <a href="${image.file}"><img src="${image.file}" loading="lazy" alt="${escapeHtml(image.description)}"></a>
        <figcaption>${escapeHtml(image.description)}</figcaption>
      </figure>`).join("");
  const metrics = DEVICES[run.device].metrics;
  return `
    <section>
      <h3>${run.device === "handy" ? "Handy" : "Desktop"} (${metrics.width} × ${metrics.height}, Profil „${run.profile}“) ·
        ${run.cols} × ${run.rows} Zellen · ${errors}</h3>
      <p class="url">${escapeHtml(path.relative(PROJECT_DIR, run.scene.page))}?seed=${SEED}</p>
      <div class="strip ${run.device}">${pictures}
      </div>
    </section>`;
}

function writeOverviewPage(runs) {
  const sceneSection = (scene) => `
  <h2>${escapeHtml(scene.title)}</h2>
  ${runs.filter((run) => run.scene === scene).map(runAsHtml).join("")}`;

  const html = `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Prototyp 6 – Vergleichsbilder</title>
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
  <h1>Prototyp 6 – Vergleichsbilder für den Neubau</h1>
  <p>Erzeugt am ${new Date().toLocaleString("de-DE")} mit <code>node werkzeuge/vergleichsbilder.js</code>
    (im Ordner prototyp/06-frage-antwort), Startwert ${SEED}. Bild anklicken für volle Größe.
    Die Begrüßung für zehn Startwerte steht in <a href="../prototyp-6-seeds/index.html">prototyp-6-seeds</a>.</p>
  ${SCENES.map(sceneSection).join("")}
</body>
</html>
`;
  fs.writeFileSync(path.join(OUTPUT_DIR, "index.html"), html);
}

function clearOldImages() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  for (const fileName of fs.readdirSync(OUTPUT_DIR)) {
    if (fileName.endsWith(".jpg")) fs.rmSync(path.join(OUTPUT_DIR, fileName));
  }
}

async function main() {
  clearOldImages();
  const runs = (await Promise.all(Object.keys(DEVICES).map(photographDevice))).flat();
  writeOverviewPage(runs);
  console.log(`Fertig: ${path.join(OUTPUT_DIR, "index.html")}`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
