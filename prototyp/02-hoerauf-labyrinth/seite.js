// Die Seite: liest die Regler, erzeugt das Labyrinth und zeichnet die Animation.

const canvas = document.getElementById("maze");
const ctx = canvas.getContext("2d");

// Alles, was sich zwischen zwei Bildern merken muss.
const scene = {
  maze: null,
  route: [],
  entrance: null, // { cell, side }: wo der Lichtpunkt hereinkommt
  exit: null, // { cell, side }: wo er hinausgeht
  cellSize: 24,
  offsetX: 0, // Abstand des Labyrinths vom linken Canvas-Rand (zum Zentrieren)
  offsetY: 0,
  progress: 0, // wie viele Routen-Schritte der Lichtpunkt schon gelaufen ist (mit Nachkommastellen)
  clock: 0, // Sekunden seit dem Start der Seite
  walkedAt: [], // walkedAt[schritt]: Stand der Uhr, als dieser Schritt fertig gelaufen war
  lastFrameTime: null,
  needsRedraw: true,
};

// Regler, die ein neues Labyrinth verlangen. Alle anderen ändern nur das Aussehen.
const REGENERATING_CONTROLS = [
  "text", "seed", "cellSize", "windiness", "detour", "entranceSide", "exitSide",
];

// Die Helligkeit der Spur wird in so viele Stufen eingeteilt. Wegstücke gleicher
// Stufe werden in einem Rutsch gezeichnet - jedes Stück einzeln wäre zu langsam.
const BRIGHTNESS_LEVELS = 16;

const THEMES = {
  light: { backgroundColor: "#ffffff", wallColor: "#3346b0", trailColor: "#ff3d8b", dotColor: "#e0102a", glow: 6 },
  dark: { backgroundColor: "#0d1117", wallColor: "#3b4a6b", trailColor: "#ff5fa2", dotColor: "#fff3b0", glow: 12 },
};

function readSettings() {
  const numberOf = (id) => Number(document.getElementById(id).value);
  const valueOf = (id) => document.getElementById(id).value;
  return {
    text: valueOf("text"),
    seed: numberOf("seed"),
    cellSize: numberOf("cellSize"),
    windiness: numberOf("windiness") / 100,
    detour: numberOf("detour") / 100,
    entranceSide: valueOf("entranceSide"),
    exitSide: valueOf("exitSide"),
    speed: numberOf("speed"),
    fadeSeconds: numberOf("fadeSeconds"),
    restBrightness: numberOf("restBrightness") / 100,
    connectorOpacity: numberOf("connectorOpacity") / 100,
    trailWidth: numberOf("trailWidth"),
    glow: numberOf("glow"),
    showPlannedPath: document.getElementById("showPlannedPath").checked,
    wallWidth: numberOf("wallWidth"),
    backgroundColor: valueOf("backgroundColor"),
    wallColor: valueOf("wallColor"),
    trailColor: valueOf("trailColor"),
    dotColor: valueOf("dotColor"),
  };
}

// Stellt die Farb-Regler auf ein vorgefertigtes Farbschema.
function applyTheme(theme) {
  for (const [id, value] of Object.entries(theme)) {
    document.getElementById(id).value = value;
  }
  showSliderValues();
  scene.needsRedraw = true;
}

// Passt die Pixelzahl des Canvas an seine Größe auf dem Bildschirm an
// (auf hochauflösenden Displays sonst unscharf).
function fitCanvasToStage() {
  const pixelRatio = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * pixelRatio;
  canvas.height = canvas.clientHeight * pixelRatio;
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
}

function restartAnimation() {
  scene.progress = 0;
  scene.walkedAt = [];
  scene.needsRedraw = true;
}

// Erzeugt ein neues Labyrinth passend zu Fenstergröße und Reglern
// und startet die Animation von vorn.
function regenerate() {
  const settings = readSettings();
  fitCanvasToStage();

  const cols = Math.max(8, Math.floor(canvas.clientWidth / settings.cellSize));
  const rows = Math.max(8, Math.floor(canvas.clientHeight / settings.cellSize));
  const { maze, route, hint, entrance, exit } = generateMessageMaze(
    settings.text, cols, rows, settings.seed, settings
  );

  scene.maze = maze;
  scene.route = route;
  scene.entrance = entrance;
  scene.exit = exit;
  scene.cellSize = settings.cellSize;
  scene.offsetX = (canvas.clientWidth - cols * settings.cellSize) / 2;
  scene.offsetY = (canvas.clientHeight - rows * settings.cellSize) / 2;
  restartAnimation();

  document.getElementById("hint").textContent = hint;
  const seconds = Math.round((route.length - 1) / settings.speed);
  document.getElementById("status").textContent =
    `${cols} × ${rows} Zellen · ${route.length - 1} Schritte · ca. ${seconds} s`;
}

// Mittelpunkt einer Zelle in Canvas-Koordinaten. Funktioniert auch für
// "krumme" Zellen wie x = 3.4 (Punkt auf dem Weg zwischen zwei Zellen).
function centerOf(cell) {
  return {
    x: scene.offsetX + (cell.x + 0.5) * scene.cellSize,
    y: scene.offsetY + (cell.y + 0.5) * scene.cellSize,
  };
}

// Wo auf der Route man nach `progress` Schritten steht.
function positionAt(progress) {
  const route = scene.route;
  const stepsDone = Math.min(Math.floor(progress), route.length - 1);
  const from = route[stepsDone];
  const to = route[Math.min(stepsDone + 1, route.length - 1)];
  const partOfStep = progress - stepsDone;
  return {
    x: from.x + (to.x - from.x) * partOfStep,
    y: from.y + (to.y - from.y) * partOfStep,
  };
}

// Bewegt den Lichtpunkt um `steps` Schritte weiter und merkt sich für jeden
// dabei fertig gelaufenen Schritt die Uhrzeit (daraus ergibt sich das Verblassen).
function advanceDot(steps) {
  const lastStep = scene.route.length - 1;
  const stepsDoneBefore = Math.floor(scene.progress);
  scene.progress = Math.min(lastStep, scene.progress + steps);
  for (let step = stepsDoneBefore + 1; step <= Math.floor(scene.progress); step++) {
    scene.walkedAt[step] = scene.clock;
  }
}

function drawWalls(settings) {
  const { maze, cellSize, offsetX, offsetY } = scene;

  const isOpening = (x, y, side) =>
    [scene.entrance, scene.exit].some(
      (opening) => opening.side === side && opening.cell.x === x && opening.cell.y === y
    );
  const wall = (x1, y1, x2, y2) => {
    ctx.moveTo(offsetX + x1 * cellSize, offsetY + y1 * cellSize);
    ctx.lineTo(offsetX + x2 * cellSize, offsetY + y2 * cellSize);
  };

  ctx.beginPath();
  for (let y = 0; y < maze.rows; y++) {
    for (let x = 0; x < maze.cols; x++) {
      const isLastCol = x === maze.cols - 1;
      const isLastRow = y === maze.rows - 1;
      const hasRightWall = isLastCol ? !isOpening(x, y, "right") : !maze.openRight[y][x];
      const hasBottomWall = isLastRow ? !isOpening(x, y, "bottom") : !maze.openDown[y][x];

      if (hasRightWall) wall(x + 1, y, x + 1, y + 1);
      if (hasBottomWall) wall(x, y + 1, x + 1, y + 1);
      if (x === 0 && !isOpening(x, y, "left")) wall(0, y, 0, y + 1);
      if (y === 0 && !isOpening(x, y, "top")) wall(x, 0, x + 1, 0);
    }
  }

  ctx.strokeStyle = settings.wallColor;
  ctx.lineWidth = settings.wallWidth;
  ctx.lineCap = "square";
  ctx.stroke();
}

// Wie hell ein gelaufener Schritt gerade noch leuchtet, als Stufe von 0 bis BRIGHTNESS_LEVELS.
// Frisch gelaufen = volle Helligkeit, danach fällt sie über `fadeSeconds` auf die Rest-Helligkeit.
function brightnessLevelOf(step, settings) {
  const walkedAt = scene.walkedAt[step];
  const isStillBeingWalked = walkedAt === undefined;
  if (isStillBeingWalked || settings.fadeSeconds === 0) return BRIGHTNESS_LEVELS;

  const age = scene.clock - walkedAt;
  const brightness = Math.max(settings.restBrightness, 1 - age / settings.fadeSeconds);
  return Math.ceil(brightness * BRIGHTNESS_LEVELS);
}

// Zeichnet von der schon gelaufenen Route die Wegstücke einer Art und einer Helligkeitsstufe.
function strokeWalkedSegments(kind, level, levelOfStep) {
  const route = scene.route;
  const lastStep = Math.min(Math.ceil(scene.progress), route.length - 1);

  ctx.beginPath();
  for (let step = 1; step <= lastStep; step++) {
    if (route[step].kind !== kind || levelOfStep[step] !== level) continue;
    const from = centerOf(route[step - 1]);
    const isStillWalking = step > scene.progress;
    const to = centerOf(isStillWalking ? positionAt(scene.progress) : route[step]);
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
  }
  ctx.stroke();
}

// Zeichnet die Umlaut-Punkte einer Helligkeitsstufe, bei denen der Lichtpunkt schon war.
function fillUmlautDots(level, levelOfStep, settings) {
  const route = scene.route;
  ctx.beginPath();
  for (let step = 1; step <= Math.floor(scene.progress); step++) {
    if (!route[step].isDot || levelOfStep[step] !== level) continue;
    const center = centerOf(route[step]);
    ctx.moveTo(center.x, center.y);
    ctx.arc(center.x, center.y, settings.trailWidth * 0.8, 0, 2 * Math.PI);
  }
  ctx.fill();
}

function drawTrail(settings) {
  const levelOfStep = scene.route.map((_, step) => brightnessLevelOf(step, settings));

  ctx.save();
  ctx.strokeStyle = settings.trailColor;
  ctx.fillStyle = settings.trailColor;
  ctx.lineWidth = settings.trailWidth;
  ctx.lineCap = "round";

  // Verbindungen zuerst, damit die Buchstaben darüber liegen
  for (let level = 1; level <= BRIGHTNESS_LEVELS; level++) {
    ctx.globalAlpha = (level / BRIGHTNESS_LEVELS) * settings.connectorOpacity;
    strokeWalkedSegments(CONNECTOR, level, levelOfStep);
  }

  ctx.shadowColor = settings.trailColor;
  ctx.shadowBlur = settings.glow;
  for (let level = 1; level <= BRIGHTNESS_LEVELS; level++) {
    ctx.globalAlpha = level / BRIGHTNESS_LEVELS;
    strokeWalkedSegments(LETTER, level, levelOfStep);
    fillUmlautDots(level, levelOfStep, settings);
  }
  ctx.restore();
}

// Der Weg, der noch vor dem Lichtpunkt liegt (wie die gestrichelte Linie in der Skizze).
function drawPlannedPath(settings) {
  const route = scene.route;
  const here = centerOf(positionAt(scene.progress));

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(here.x, here.y);
  for (let step = Math.floor(scene.progress) + 1; step < route.length; step++) {
    const point = centerOf(route[step]);
    ctx.lineTo(point.x, point.y);
  }
  ctx.strokeStyle = settings.trailColor;
  ctx.globalAlpha = 0.6;
  ctx.lineWidth = Math.max(1, settings.trailWidth / 3);
  ctx.setLineDash([4, 5]);
  ctx.stroke();
  ctx.restore();
}

function drawDot(settings) {
  const position = centerOf(positionAt(scene.progress));
  ctx.save();
  ctx.fillStyle = settings.dotColor;
  ctx.shadowColor = settings.dotColor;
  ctx.shadowBlur = scene.cellSize;
  ctx.beginPath();
  ctx.arc(position.x, position.y, scene.cellSize * 0.28, 0, 2 * Math.PI);
  ctx.fill();
  ctx.restore();
}

function drawScene(settings) {
  const { maze, cellSize, offsetX, offsetY } = scene;

  ctx.fillStyle = settings.backgroundColor;
  ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  drawWalls(settings);

  // Spur und Lichtpunkt nur innerhalb des Labyrinths zeichnen: so taucht der Punkt
  // am Eingang auf und verschwindet am Ausgang.
  ctx.save();
  ctx.beginPath();
  ctx.rect(offsetX, offsetY, maze.cols * cellSize, maze.rows * cellSize);
  ctx.clip();
  if (settings.showPlannedPath) drawPlannedPath(settings);
  drawTrail(settings);
  drawDot(settings);
  ctx.restore();
}

// Läuft einmal pro Bildschirm-Bild: bewegt den Lichtpunkt weiter und zeichnet neu.
// Gezeichnet wird nur, wenn sich etwas geändert hat.
function onAnimationFrame(now) {
  const settings = readSettings();
  const longestPause = 0.1; // verhindert einen Riesensprung, wenn der Tab im Hintergrund war
  const secondsSinceLastFrame =
    scene.lastFrameTime === null ? 0 : Math.min(longestPause, (now - scene.lastFrameTime) / 1000);
  scene.lastFrameTime = now;
  scene.clock += secondsSinceLastFrame;

  const lastStep = scene.route.length - 1;
  const isWalking = scene.progress < lastStep;
  if (isWalking) advanceDot(settings.speed * secondsSinceLastFrame);

  const secondsSinceArrival = scene.clock - scene.walkedAt[lastStep];
  const isStillFading = settings.fadeSeconds > 0 && secondsSinceArrival <= settings.fadeSeconds + 0.5;

  if (isWalking || isStillFading || scene.needsRedraw) {
    drawScene(settings);
    scene.needsRedraw = false;
  }
  requestAnimationFrame(onAnimationFrame);
}

// Schreibt neben jeden Schieberegler seinen aktuellen Wert.
function showSliderValues() {
  document.querySelectorAll("span[data-for]").forEach((label) => {
    label.textContent = document.getElementById(label.dataset.for).value;
  });
}

function connectControls() {
  document.querySelectorAll("#controls input, #controls select").forEach((control) => {
    control.addEventListener("input", () => {
      showSliderValues();
      if (REGENERATING_CONTROLS.includes(control.id)) regenerate();
      scene.needsRedraw = true;
    });
  });

  document.getElementById("replay").addEventListener("click", restartAnimation);
  document.getElementById("jumpToEnd").addEventListener("click", () => {
    advanceDot(Infinity);
    scene.needsRedraw = true;
  });
  document.getElementById("newSeed").addEventListener("click", () => {
    document.getElementById("seed").value = Math.floor(Math.random() * 1000000);
    regenerate();
  });
  document.getElementById("themeLight").addEventListener("click", () => applyTheme(THEMES.light));
  document.getElementById("themeDark").addEventListener("click", () => applyTheme(THEMES.dark));

  window.addEventListener("resize", regenerate);
}

connectControls();
showSliderValues();
regenerate();
requestAnimationFrame(onAnimationFrame);
