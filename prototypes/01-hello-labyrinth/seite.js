// Die Seite: liest die Regler, erzeugt das Labyrinth und zeichnet die Animation.

const canvas = document.getElementById("maze");
const ctx = canvas.getContext("2d");

// Alles, was sich zwischen zwei Bildern merken muss.
const scene = {
  maze: null,
  route: [],
  cellSize: 24,
  offsetX: 0, // Abstand des Labyrinths vom linken Canvas-Rand (zum Zentrieren)
  offsetY: 0,
  progress: 0, // wie viele Routen-Schritte der Lichtpunkt schon gelaufen ist (mit Nachkommastellen)
  lastFrameTime: null,
  needsRedraw: true,
};

// Regler, die ein neues Labyrinth verlangen. Alle anderen ändern nur das Aussehen.
const REGENERATING_CONTROLS = ["text", "seed", "cellSize", "windiness"];

function readSettings() {
  const numberOf = (id) => Number(document.getElementById(id).value);
  const valueOf = (id) => document.getElementById(id).value;
  return {
    text: valueOf("text"),
    seed: numberOf("seed"),
    cellSize: numberOf("cellSize"),
    windiness: numberOf("windiness") / 100,
    speed: numberOf("speed"),
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

// Passt die Pixelzahl des Canvas an seine Größe auf dem Bildschirm an
// (auf hochauflösenden Displays sonst unscharf).
function fitCanvasToStage() {
  const pixelRatio = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * pixelRatio;
  canvas.height = canvas.clientHeight * pixelRatio;
  ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
}

// Erzeugt ein neues Labyrinth passend zu Fenstergröße und Reglern
// und startet die Animation von vorn.
function regenerate() {
  const settings = readSettings();
  fitCanvasToStage();

  const cols = Math.max(8, Math.floor(canvas.clientWidth / settings.cellSize));
  const rows = Math.max(8, Math.floor(canvas.clientHeight / settings.cellSize));
  const { maze, route, hint } = generateMessageMaze(
    settings.text, cols, rows, settings.seed, settings.windiness
  );

  scene.maze = maze;
  scene.route = route;
  scene.cellSize = settings.cellSize;
  scene.offsetX = (canvas.clientWidth - cols * settings.cellSize) / 2;
  scene.offsetY = (canvas.clientHeight - rows * settings.cellSize) / 2;
  scene.progress = 0;
  scene.needsRedraw = true;

  document.getElementById("hint").textContent = hint;
  const seconds = Math.round((route.length - 1) / settings.speed);
  document.getElementById("status").textContent =
    `${cols} × ${rows} Zellen · ${route.length - 1} Schritte · ca. ${seconds} s · Seed ${settings.seed}`;
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

function drawWalls(settings) {
  const { maze, cellSize, offsetX, offsetY } = scene;
  const start = scene.route[0];
  const end = scene.route[scene.route.length - 1];

  ctx.beginPath();
  const wall = (x1, y1, x2, y2) => {
    ctx.moveTo(offsetX + x1 * cellSize, offsetY + y1 * cellSize);
    ctx.lineTo(offsetX + x2 * cellSize, offsetY + y2 * cellSize);
  };

  for (let y = 0; y < maze.rows; y++) {
    for (let x = 0; x < maze.cols; x++) {
      const isExit = x === end.x && y === end.y;
      if (!maze.openRight[y][x] && !isExit) wall(x + 1, y, x + 1, y + 1);
      if (!maze.openDown[y][x]) wall(x, y + 1, x + 1, y + 1);
    }
  }
  // Oberer Rand und linker Rand mit Lücke für den Eingang
  wall(0, 0, maze.cols, 0);
  wall(0, 0, 0, start.y);
  wall(0, start.y + 1, 0, maze.rows);

  ctx.strokeStyle = settings.wallColor;
  ctx.lineWidth = settings.wallWidth;
  ctx.lineCap = "square";
  ctx.stroke();
}

// Zeichnet von der schon gelaufenen Route entweder nur die Buchstaben-Stücke
// oder nur die Verbindungs-Stücke, damit beide unterschiedlich aussehen können.
function strokeWalkedSegments(wantLetters) {
  const route = scene.route;
  const lastStep = Math.min(Math.ceil(scene.progress), route.length - 1);

  ctx.beginPath();
  for (let step = 1; step <= lastStep; step++) {
    if (route[step].isLetter !== wantLetters) continue;
    const from = centerOf(route[step - 1]);
    const isStillWalking = step > scene.progress;
    const to = centerOf(isStillWalking ? positionAt(scene.progress) : route[step]);
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
  }
  ctx.stroke();
}

function drawTrail(settings) {
  ctx.save();
  ctx.strokeStyle = settings.trailColor;
  ctx.lineWidth = settings.trailWidth;
  ctx.lineCap = "round";

  // Verbindungen zuerst, damit die Buchstaben darüber liegen
  ctx.globalAlpha = settings.connectorOpacity;
  strokeWalkedSegments(false);

  ctx.globalAlpha = 1;
  ctx.shadowColor = settings.trailColor;
  ctx.shadowBlur = settings.glow;
  strokeWalkedSegments(true);
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
  ctx.fillStyle = settings.backgroundColor;
  ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  drawWalls(settings);
  if (settings.showPlannedPath) drawPlannedPath(settings);
  drawTrail(settings);
  drawDot(settings);
}

// Läuft einmal pro Bildschirm-Bild: bewegt den Lichtpunkt weiter und zeichnet neu.
// Gezeichnet wird nur, wenn sich etwas geändert hat.
function onAnimationFrame(now) {
  const settings = readSettings();
  const secondsSinceLastFrame = scene.lastFrameTime === null ? 0 : (now - scene.lastFrameTime) / 1000;
  scene.lastFrameTime = now;

  const lastStep = scene.route.length - 1;
  const isWalking = scene.progress < lastStep;
  if (isWalking) {
    scene.progress = Math.min(lastStep, scene.progress + settings.speed * secondsSinceLastFrame);
  }

  if (isWalking || scene.needsRedraw) {
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
  document.querySelectorAll("#controls input").forEach((input) => {
    input.addEventListener("input", () => {
      showSliderValues();
      if (REGENERATING_CONTROLS.includes(input.id)) regenerate();
      scene.needsRedraw = true;
    });
  });

  document.getElementById("replay").addEventListener("click", () => {
    scene.progress = 0;
    scene.needsRedraw = true;
  });
  document.getElementById("jumpToEnd").addEventListener("click", () => {
    scene.progress = scene.route.length - 1;
    scene.needsRedraw = true;
  });
  document.getElementById("newSeed").addEventListener("click", () => {
    document.getElementById("seed").value = Math.floor(Math.random() * 1000000);
    regenerate();
  });

  window.addEventListener("resize", regenerate);
}

connectControls();
showSliderValues();
regenerate();
requestAnimationFrame(onAnimationFrame);
