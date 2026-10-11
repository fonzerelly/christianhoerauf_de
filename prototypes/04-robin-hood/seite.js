// Die Seite: liest die Regler, erzeugt das Labyrinth und zeichnet die Verfolgungsjagd.
//
// Wer wo steht, ergibt sich allein aus EINER Zahl: scene.progress, dem Fortschritt
// von Robin Hood auf der Route. Jede Wache läuft dieselbe Route, nur um einen festen
// Rückstand später (siehe guardProgress). So laufen alle garantiert denselben Weg.

const canvas = document.getElementById("maze");
const ctx = canvas.getContext("2d");

// Alles, was sich zwischen zwei Bildern merken muss.
const scene = {
  maze: null,
  route: [],
  entrance: null, // { cell, side }: wo Robin Hood hereinkommt
  exit: null, // { cell, side }: wo er hinausläuft
  cellSize: 30,
  wallThickness: 9, // Dicke der Mauern in Pixeln
  offsetX: 0, // Abstand des Labyrinths vom linken Canvas-Rand (zum Zentrieren)
  offsetY: 0,
  backdrop: null, // das fertig gemalte Bild von Wiese, Hof und Mauern
  progress: 0, // wie viele Routen-Schritte Robin Hood schon gelaufen ist (mit Nachkommastellen);
  //              läuft über das Routenende hinaus weiter, bis auch die letzte Wache draußen ist
  isPaused: false,
  lastFrameTime: null,
  needsRedraw: true,
};

// Regler, die ein neues Labyrinth verlangen.
const REGENERATING_CONTROLS = [
  "text", "seed", "cellSize", "windiness", "detour", "entranceSide", "exitSide",
];
// Regler, nach denen nur Boden und Mauern neu gemalt werden müssen.
const REPAINTING_CONTROLS = ["wallThickness"];

const SMALLEST_GRID = 8; // so viele Zellen hat das Labyrinth mindestens in jeder Richtung
const CASTLE_MARGIN = 0.75; // so viele Zellen Wiese bleiben rund um die Burg mindestens frei
const LARGEST_AUTO_CELL_SIZE = 34; // größer wählt die Seite die Zellgröße nicht von selbst

const TURN_ZONE = 0.3; // so viele Schritte vor und nach einer Ecke dreht sich eine Figur
const TORCH_REACH = 0.55; // so viele Zellen vor und hinter einer Wache leuchtet ihre Fackel
const TORCHLIGHT_COLOR = "#ffd23e";
const FOOTPRINTS_PER_STEP = 2;
const FOOTPRINT_COLOR = "#fff6d8";
const PLANNED_PATH_COLOR = "#fff6d8";

function readSettings() {
  const numberOf = (id) => Number(document.getElementById(id).value);
  const valueOf = (id) => document.getElementById(id).value;
  const isChecked = (id) => document.getElementById(id).checked;
  return {
    text: valueOf("text"),
    seed: numberOf("seed"),
    cellSize: numberOf("cellSize"),
    windiness: numberOf("windiness") / 100,
    detour: numberOf("detour") / 100,
    entranceSide: valueOf("entranceSide"),
    exitSide: valueOf("exitSide"),
    wallThickness: numberOf("wallThickness") / 100, // Anteil der Zellgröße
    speed: numberOf("speed"),
    guardCount: numberOf("guardCount"),
    headStart: numberOf("headStart"), // Robin Hoods Vorsprung vor der ersten Wache, in Zellen
    guardSpacing: numberOf("guardSpacing"), // Abstand von Wache zu Wache, in Zellen
    figureScale: numberOf("figureScale") / 100,
    torchlight: numberOf("torchlight") / 100,
    connectorTorchlight: numberOf("connectorTorchlight") / 100,
    showFootprints: isChecked("showFootprints"),
    showPlannedPath: isChecked("showPlannedPath"),
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

// Wie viele Zellen bei dieser Zellgröße ins Fenster passen, wenn rundherum
// noch ein Streifen Wiese frei bleiben soll.
function gridSizeFor(cellSize) {
  const margin = 2 * CASTLE_MARGIN * cellSize;
  return {
    cols: Math.max(SMALLEST_GRID, Math.floor((canvas.clientWidth - margin) / cellSize)),
    rows: Math.max(SMALLEST_GRID, Math.floor((canvas.clientHeight - margin) / cellSize)),
  };
}

// Sucht die größte Zellgröße, bei der der Text noch ins Fenster passt, ohne dass
// ein Wort zerteilt wird. Je größer die Zellen, desto besser erkennt man die Figuren.
function largestCellSizeThatFits(text) {
  const slider = document.getElementById("cellSize");
  for (let cellSize = LARGEST_AUTO_CELL_SIZE; cellSize > Number(slider.min); cellSize--) {
    const { cols, rows } = gridSizeFor(cellSize);
    if (textFitsGrid(text, cols, rows)) return cellSize;
  }
  return Number(slider.min);
}

function restartAnimation() {
  scene.progress = 0;
  scene.needsRedraw = true;
}

// Malt Wiese, Hof und Mauern auf ein unsichtbares Canvas. drawScene kopiert dieses
// fertige Bild dann nur noch, statt die Burg für jedes Bild neu zu zeichnen.
function paintBackdrop(settings) {
  const pixelRatio = window.devicePixelRatio || 1;
  const backdrop = document.createElement("canvas");
  backdrop.width = canvas.width;
  backdrop.height = canvas.height;
  const backdropCtx = backdrop.getContext("2d");
  backdropCtx.scale(pixelRatio, pixelRatio);

  scene.wallThickness = scene.cellSize * settings.wallThickness;
  drawCastle(backdropCtx, {
    maze: scene.maze,
    entrance: scene.entrance,
    exit: scene.exit,
    cellSize: scene.cellSize,
    offsetX: scene.offsetX,
    offsetY: scene.offsetY,
    wallThickness: scene.wallThickness,
    width: canvas.clientWidth,
    height: canvas.clientHeight,
    seed: settings.seed,
  });
  scene.backdrop = backdrop;
  scene.needsRedraw = true;
}

// Robin Hoods Vorsprung vor der letzten Wache, in Routen-Schritten.
function chaseLength(settings) {
  if (settings.guardCount === 0) return 0;
  return settings.headStart + (settings.guardCount - 1) * settings.guardSpacing;
}

// Bei diesem Fortschritt ist die Jagd vorbei: auch die letzte Wache ist am Routenende.
function finalProgress(settings) {
  return scene.route.length - 1 + chaseLength(settings);
}

// Wo auf der Route die Wache mit dieser Nummer steht (0 = die vorderste).
// Negativ: sie ist noch gar nicht losgelaufen.
function guardProgress(guardIndex, settings) {
  return scene.progress - settings.headStart - guardIndex * settings.guardSpacing;
}

// Schreibt Rastergröße, Schrittzahl und Dauer der Jagd unter das Textfeld.
function showStatus(settings) {
  const { cols, rows } = scene.maze;
  const steps = scene.route.length - 1;
  const seconds = Math.round(finalProgress(settings) / settings.speed);
  document.getElementById("status").textContent =
    `${cols} × ${rows} Zellen · ${steps} Schritte · ca. ${seconds} s`;
}

// Erzeugt ein neues Labyrinth passend zu Fenstergröße und Reglern, malt die Burg
// und startet die Jagd von vorn.
function regenerate() {
  const settings = readSettings();
  fitCanvasToStage();

  const { cols, rows } = gridSizeFor(settings.cellSize);
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
  paintBackdrop(settings);
  restartAnimation();

  document.getElementById("hint").textContent = hint;
  showStatus(settings);
}

// Mittelpunkt einer Zelle in Canvas-Koordinaten. Funktioniert auch für
// "krumme" Zellen wie x = 3.4 (Figur auf dem Weg zwischen zwei Zellen).
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

// Die Richtung, in die der Schritt von Zelle `step` zur nächsten Zelle zeigt,
// als Winkel (0 = nach rechts, im Uhrzeigersinn). Vor dem Anfang und hinter dem
// Ende der Route gilt die Richtung des ersten bzw. letzten Schritts.
function directionOfStep(step) {
  const route = scene.route;
  const clampedStep = Math.max(0, Math.min(step, route.length - 2));
  const from = route[clampedStep];
  const to = route[clampedStep + 1];
  return Math.atan2(to.y - from.y, to.x - from.x);
}

// Ein Winkel zwischen zwei Winkeln. share = 0 ergibt `from`, share = 1 ergibt `to`.
// Gedreht wird immer über den kürzeren Weg; eine Kehrtwende dreht rechts herum.
function blendAngles(from, to, share) {
  let turn = to - from;
  while (turn > Math.PI) turn -= 2 * Math.PI;
  while (turn <= -Math.PI) turn += 2 * Math.PI;
  return from + turn * share;
}

// Wohin eine Figur nach `progress` Schritten schaut. Kurz vor und kurz nach einer
// Ecke dreht sie sich allmählich von der alten in die neue Richtung, statt umzuspringen.
function headingAt(progress) {
  const step = Math.floor(progress);
  const partOfStep = progress - step;
  const currentDirection = directionOfStep(step);

  const justLeftCorner = partOfStep < TURN_ZONE;
  const isNearingCorner = partOfStep > 1 - TURN_ZONE;
  if (justLeftCorner) {
    const turnDone = 0.5 + partOfStep / (2 * TURN_ZONE);
    return blendAngles(directionOfStep(step - 1), currentDirection, turnDone);
  }
  if (isNearingCorner) {
    const turnDone = (partOfStep - (1 - TURN_ZONE)) / (2 * TURN_ZONE);
    return blendAngles(currentDirection, directionOfStep(step + 1), turnDone);
  }
  return currentDirection;
}

// Die Haltung einer Figur, die `progress` Schritte gelaufen ist (siehe figuren.js).
// Pro Zelle macht sie einen Schritt; strideShift verschiebt den Takt, damit nicht
// alle Wachen im Gleichschritt laufen.
function poseAt(progress, settings, strideShift) {
  const center = centerOf(positionAt(progress));
  return {
    x: center.x,
    y: center.y,
    heading: headingAt(progress),
    size: scene.cellSize * settings.figureScale,
    swing: Math.sin(progress * Math.PI + strideShift),
  };
}

// Lässt Robin Hood (und damit alle Wachen) um `steps` Schritte weiterlaufen.
function advanceChase(steps, settings) {
  scene.progress = Math.min(finalProgress(settings), scene.progress + steps);
}

// Legt von der Route die Wegstücke einer Art in den aktuellen Pfad, die zwischen
// zwei Fortschritts-Werten liegen. Angebrochene Schritte an beiden Enden werden
// nur so weit aufgenommen, wie sie in den Bereich fallen.
function traceRouteStretch(fromProgress, toProgress, kind) {
  const route = scene.route;
  const from = Math.max(0, fromProgress);
  const to = Math.min(route.length - 1, toProgress);

  for (let step = Math.floor(from) + 1; step <= Math.ceil(to); step++) {
    if (route[step].kind !== kind) continue;
    const start = centerOf(positionAt(Math.max(from, step - 1)));
    const end = centerOf(positionAt(Math.min(to, step)));
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
  }
}

// Der Fackelschein der Wachen: Jede Wache beleuchtet ein kurzes Stück des Wegs um
// sich herum - in Buchstaben-Gängen kräftig, auf Verbindungswegen nur schwach.
// Dadurch zeichnet die Wachen-Reihe den Buchstaben nach, in dem sie gerade steckt.
function drawTorchlight(settings) {
  const strokeLightOn = (kind, strength) => {
    if (strength === 0) return;
    ctx.globalAlpha = strength;
    ctx.beginPath();
    for (let guardIndex = 0; guardIndex < settings.guardCount; guardIndex++) {
      const progress = guardProgress(guardIndex, settings);
      traceRouteStretch(progress - TORCH_REACH, progress + TORCH_REACH, kind);
    }
    ctx.stroke();
  };

  const corridorWidth = scene.cellSize - scene.wallThickness;
  ctx.save();
  ctx.strokeStyle = TORCHLIGHT_COLOR;
  ctx.shadowColor = TORCHLIGHT_COLOR;
  ctx.shadowBlur = scene.cellSize * 0.3;
  ctx.lineWidth = corridorWidth * 0.8;
  ctx.lineCap = "round";
  strokeLightOn(CONNECTOR, settings.connectorTorchlight);
  strokeLightOn(LETTER, settings.torchlight);
  ctx.restore();
}

// Legt Robin Hoods Fußabdrücke auf Wegstücken einer Art in den aktuellen Pfad:
// abwechselnd links und rechts der Weglinie, in Laufrichtung gedreht.
function traceFootprints(kind) {
  const lastStep = scene.route.length - 1;
  const printsMade = Math.floor(Math.min(scene.progress, lastStep) * FOOTPRINTS_PER_STEP);
  const length = scene.cellSize * 0.12;
  const width = scene.cellSize * 0.065;
  const sideways = scene.cellSize * 0.11;

  for (let print = 0; print < printsMade; print++) {
    const progress = (print + 0.5) / FOOTPRINTS_PER_STEP;
    const step = Math.floor(progress);
    if (scene.route[step + 1].kind !== kind) continue;

    const direction = directionOfStep(step);
    const side = print % 2 === 0 ? -1 : 1;
    const onPath = centerOf(positionAt(progress));
    const x = onPath.x - Math.sin(direction) * sideways * side;
    const y = onPath.y + Math.cos(direction) * sideways * side;
    ctx.moveTo(x + Math.cos(direction) * length, y + Math.sin(direction) * length);
    ctx.ellipse(x, y, length, width, direction, 0, 2 * Math.PI);
  }
}

// Die zuschaltbare Spur: Robin Hoods Fußabdrücke bleiben liegen. In Buchstaben-Gängen
// sind sie kräftig, auf Verbindungswegen blass, auf Abstechern zu Umlaut-Punkten fehlen sie.
function drawFootprints() {
  const fillPrintsOn = (kind, opacity) => {
    ctx.globalAlpha = opacity;
    ctx.beginPath();
    traceFootprints(kind);
    ctx.fill();
  };

  ctx.save();
  ctx.fillStyle = FOOTPRINT_COLOR;
  fillPrintsOn(CONNECTOR, 0.22);
  fillPrintsOn(LETTER, 0.95);
  ctx.restore();
}

// Die Goldmünzen an allen Umlaut-Punkten, an denen Robin Hood schon war.
// Sie bleiben liegen und sind damit der Umlaut-Punkt.
function drawDroppedCoins() {
  const route = scene.route;
  const stepsDone = Math.min(Math.floor(scene.progress), route.length - 1);
  for (let step = 1; step <= stepsDone; step++) {
    if (!route[step].isDot) continue;
    const center = centerOf(route[step]);
    drawCoinPile(ctx, center.x, center.y, scene.cellSize);
  }
}

// Der Weg, der noch vor Robin Hood liegt, als gestrichelte Linie (abschaltbar).
function drawPlannedPath() {
  const route = scene.route;
  const here = centerOf(positionAt(scene.progress));

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(here.x, here.y);
  for (let step = Math.floor(scene.progress) + 1; step < route.length; step++) {
    const point = centerOf(route[step]);
    ctx.lineTo(point.x, point.y);
  }
  ctx.strokeStyle = PLANNED_PATH_COLOR;
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = Math.max(1, scene.cellSize * 0.06);
  ctx.setLineDash([4, 5]);
  ctx.stroke();
  ctx.restore();
}

// Zeichnet Robin Hood und alle Wachen, die gerade auf der Route unterwegs sind.
// Wer noch nicht losgelaufen oder schon am Routenende angekommen ist, wird nicht gezeichnet -
// beides liegt außerhalb des Bildes. Die hinterste Wache wird zuerst gezeichnet,
// Robin Hood zuletzt: so liegt bei Überschneidungen immer der Vordere oben.
function drawChase(settings) {
  const lastStep = scene.route.length - 1;
  const isOnRoute = (progress) => progress >= 0 && progress < lastStep;

  for (let guardIndex = settings.guardCount - 1; guardIndex >= 0; guardIndex--) {
    const progress = guardProgress(guardIndex, settings);
    if (!isOnRoute(progress)) continue;
    const isCaptain = guardIndex === 0;
    const strideShift = guardIndex * 2.4;
    drawGuard(ctx, poseAt(progress, settings, strideShift), isCaptain);
  }
  if (isOnRoute(scene.progress)) drawRobinHood(ctx, poseAt(scene.progress, settings, 0));
}

// Ein komplettes Bild: die fertig gemalte Burg, darauf von unten nach oben
// Fackelschein, Spuren, Münzen und die Figuren.
function drawScene(settings) {
  ctx.drawImage(scene.backdrop, 0, 0, canvas.clientWidth, canvas.clientHeight);
  if (settings.showPlannedPath) drawPlannedPath();
  drawTorchlight(settings);
  if (settings.showFootprints) drawFootprints();
  drawDroppedCoins();
  drawChase(settings);
}

// Läuft einmal pro Bildschirm-Bild: lässt die Jagd weiterlaufen und zeichnet neu.
// Gezeichnet wird nur, wenn sich etwas geändert hat.
function onAnimationFrame(now) {
  const settings = readSettings();
  const longestPause = 0.1; // verhindert einen Riesensprung, wenn der Tab im Hintergrund war
  const secondsSinceLastFrame =
    scene.lastFrameTime === null ? 0 : Math.min(longestPause, (now - scene.lastFrameTime) / 1000);
  scene.lastFrameTime = now;

  const isChaseRunning = !scene.isPaused && scene.progress < finalProgress(settings);
  if (isChaseRunning) advanceChase(settings.speed * secondsSinceLastFrame, settings);

  if (isChaseRunning || scene.needsRedraw) {
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

function togglePause() {
  scene.isPaused = !scene.isPaused;
  document.getElementById("pause").textContent = scene.isPaused ? "Weiter" : "Pause";
}

// Stellt Robin Hood ans Routenende (er ist dann schon draußen); die Wachen
// laufen ihm von dort aus noch hinterher.
function jumpToEnd() {
  scene.progress = Math.max(scene.progress, scene.route.length - 1);
  scene.needsRedraw = true;
}

function connectControls() {
  document.querySelectorAll("#controls input, #controls select").forEach((control) => {
    control.addEventListener("input", () => {
      showSliderValues();
      if (REGENERATING_CONTROLS.includes(control.id)) regenerate();
      if (REPAINTING_CONTROLS.includes(control.id)) paintBackdrop(readSettings());
      showStatus(readSettings());
      scene.needsRedraw = true;
    });
  });

  document.getElementById("replay").addEventListener("click", restartAnimation);
  document.getElementById("jumpToEnd").addEventListener("click", jumpToEnd);
  document.getElementById("pause").addEventListener("click", togglePause);
  document.getElementById("newSeed").addEventListener("click", () => {
    document.getElementById("seed").value = Math.floor(Math.random() * 1000000);
    regenerate();
  });

  window.addEventListener("resize", regenerate);
}

document.getElementById("cellSize").value = largestCellSizeThatFits(readSettings().text);
connectControls();
showSliderValues();
regenerate();
requestAnimationFrame(onAnimationFrame);
