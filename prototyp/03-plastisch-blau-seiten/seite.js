// Die Seite: liest die Regler, erzeugt die Labyrinth-Seiten und zeichnet die Animation.

const canvas = document.getElementById("maze");
const ctx = canvas.getContext("2d");

// Die Abschnitte der Animation. Sie wiederholen sich für jede Labyrinth-Seite.
const WRITING = "writing"; // der Lichtpunkt läuft und schreibt
const FADING = "fading"; // der Lichtpunkt ist draußen, die Spur verglimmt noch
const SCROLLING = "scrolling"; // das Bild schiebt weiter zur nächsten Seite
const FINISHED = "finished"; // letzte Seite geschrieben und verglommen

// Alles, was sich zwischen zwei Bildern merken muss.
const scene = {
  pages: [], // alle Labyrinth-Seiten: { maze, route, entrance, exit, lines }
  pageIndex: 0, // die Seite, auf der der Lichtpunkt gerade unterwegs ist
  phase: WRITING,
  phaseStartedAt: 0, // Stand der Uhr, als der aktuelle Abschnitt begann
  cellSize: 24,
  offsetX: 0, // Abstand des Labyrinths vom linken Canvas-Rand (zum Zentrieren)
  offsetY: 0,
  progress: 0, // wie viele Routen-Schritte der Lichtpunkt auf dieser Seite schon gelaufen ist (mit Nachkommastellen)
  clock: 0, // Sekunden seit dem Start der Seite
  walkedAt: [], // walkedAt[schritt]: Stand der Uhr, als dieser Schritt fertig gelaufen war
  wallImages: new Map(), // Seitennummer -> { image, padding, look }: vorab gezeichnete Wände
  lastFrameTime: null,
  needsRedraw: true,
};

// Regler, die neue Labyrinthe verlangen. Alle anderen ändern nur das Aussehen.
const REGENERATING_CONTROLS = [
  "text", "seed", "cellSize", "windiness", "detour", "entranceSide", "exitSide", "maxLinesPerPage",
];

// Die Helligkeit der Spur wird in so viele Stufen eingeteilt. Wegstücke gleicher
// Stufe werden in einem Rutsch gezeichnet - jedes Stück einzeln wäre zu langsam.
const BRIGHTNESS_LEVELS = 16;

const THEMES = {
  light: {
    backgroundColor: "#f3f3f1", wallColor: "#a4a6a9", shadowColor: "#3a3c40",
    trailColor: "#1466ff", dotColor: "#0a55f0", glow: 8, shadowStrength: 45,
  },
  dark: {
    backgroundColor: "#14161a", wallColor: "#4b4e54", shadowColor: "#000000",
    trailColor: "#3d9bff", dotColor: "#8cc8ff", glow: 14, shadowStrength: 80,
  },
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
    maxLinesPerPage: numberOf("maxLinesPerPage"),
    scrollSeconds: numberOf("scrollSeconds"),
    speed: numberOf("speed"),
    holdSeconds: numberOf("holdSeconds"),
    fadeSeconds: numberOf("fadeSeconds"),
    restBrightness: numberOf("restBrightness") / 100,
    connectorOpacity: numberOf("connectorOpacity") / 100,
    trailWidth: numberOf("trailWidth"),
    glow: numberOf("glow"),
    showPlannedPath: document.getElementById("showPlannedPath").checked,
    wallWidth: numberOf("wallWidth"),
    shadowOffset: numberOf("shadowOffset"),
    shadowBlur: numberOf("shadowBlur"),
    shadowStrength: numberOf("shadowStrength") / 100,
    edgeLight: numberOf("edgeLight") / 100,
    backgroundColor: valueOf("backgroundColor"),
    wallColor: valueOf("wallColor"),
    shadowColor: valueOf("shadowColor"),
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

function currentPage() {
  return scene.pages[scene.pageIndex];
}

function hasNextPage() {
  return scene.pageIndex < scene.pages.length - 1;
}

// Beginnt einen neuen Abschnitt der Animation und merkt sich, wann.
function enterPhase(phase) {
  scene.phase = phase;
  scene.phaseStartedAt = scene.clock;
  scene.needsRedraw = true;
}

// Setzt den Lichtpunkt an den Anfang der angegebenen Seite und vergisst die Spur.
function startPage(pageIndex) {
  scene.pageIndex = pageIndex;
  scene.progress = 0;
  scene.walkedAt = [];
  enterPhase(WRITING);
  forgetUnneededWallImages();
  showPageStatus();
}

// "Nochmal abspielen": zurück auf Seite 1.
function restartAnimation() {
  startPage(0);
}

// Erzeugt neue Labyrinth-Seiten passend zu Fenstergröße und Reglern
// und startet die Animation von vorn.
function regenerate() {
  const settings = readSettings();
  fitCanvasToStage();

  const cols = Math.max(8, Math.floor(canvas.clientWidth / settings.cellSize));
  const rows = Math.max(8, Math.floor(canvas.clientHeight / settings.cellSize));

  scene.pages = generateMessagePages(settings.text, cols, rows, settings.seed, settings);
  scene.cellSize = settings.cellSize;
  // Auf ganze Pixel gerundet, damit das vorab gezeichnete Wandbild scharf bleibt
  scene.offsetX = Math.floor((canvas.clientWidth - cols * settings.cellSize) / 2);
  scene.offsetY = Math.floor((canvas.clientHeight - rows * settings.cellSize) / 2);
  scene.wallImages.clear();
  restartAnimation();

  const capacity = textCapacity(cols, rows, settings.maxLinesPerPage);
  const totalSteps = scene.pages.reduce((sum, page) => sum + page.route.length - 1, 0);
  document.getElementById("status").textContent =
    `${cols} × ${rows} Zellen · je Seite ${capacity.linesPerPage} Zeilen zu ${capacity.charsPerLine} Zeichen · ` +
    `${totalSteps} Schritte · ca. ${Math.round(totalSteps / settings.speed)} s reine Laufzeit`;
}

function showPageStatus() {
  document.getElementById("pageStatus").textContent =
    `Seite ${scene.pageIndex + 1} von ${scene.pages.length}`;
}

// Mittelpunkt einer Zelle in Canvas-Koordinaten. Funktioniert auch für
// "krumme" Zellen wie x = 3.4 (Punkt auf dem Weg zwischen zwei Zellen).
function centerOf(cell) {
  return {
    x: scene.offsetX + (cell.x + 0.5) * scene.cellSize,
    y: scene.offsetY + (cell.y + 0.5) * scene.cellSize,
  };
}

// Wo auf der Route der aktuellen Seite man nach `progress` Schritten steht.
function positionAt(progress) {
  const route = currentPage().route;
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
// dabei fertig gelaufenen Schritt die Uhrzeit (daraus ergibt sich das Verglimmen).
function advanceDot(steps) {
  const lastStep = currentPage().route.length - 1;
  const stepsDoneBefore = Math.floor(scene.progress);
  scene.progress = Math.min(lastStep, scene.progress + steps);
  for (let step = stepsDoneBefore + 1; step <= Math.floor(scene.progress); step++) {
    scene.walkedAt[step] = scene.clock;
  }
}

// Wie viele Sekunden ein Wegstück nach dem Laufen noch zu sehen ist:
// erst volle Helligkeit, dann Ausblenden.
function trailLifetime(settings) {
  return settings.holdSeconds + settings.fadeSeconds;
}

// Stellt die Uhr um `seconds` weiter und führt die Animation fort:
//   Schreiben -> (Punkt ist draußen) Verglimmen -> Weiterschieben -> nächste Seite schreiben ...
// Nach der letzten Seite ist Schluss.
function stepAnimation(seconds, settings) {
  scene.clock += seconds;
  const secondsInPhase = scene.clock - scene.phaseStartedAt;

  if (scene.phase === WRITING) {
    advanceDot(settings.speed * seconds);
    const hasLeftThePage = scene.progress >= currentPage().route.length - 1;
    if (hasLeftThePage) {
      enterPhase(FADING);
      prepareNextWallImage(settings);
    }
  } else if (scene.phase === FADING) {
    const trailIsGone = secondsInPhase >= trailLifetime(settings);
    if (trailIsGone) enterPhase(hasNextPage() ? SCROLLING : FINISHED);
  } else if (scene.phase === SCROLLING) {
    const hasArrived = secondsInPhase >= settings.scrollSeconds;
    if (hasArrived) startPage(scene.pageIndex + 1);
  }
}

// Sanftes Anfahren und Abbremsen: bildet 0..1 auf 0..1 ab.
function easeInOut(part) {
  return part * part * (3 - 2 * part);
}

// Um wie viele Pixel die Seiten gerade verschoben sind.
//
// Das Bild schiebt in die Richtung weiter, in die der Lichtpunkt verschwunden ist:
// die alte Seite (outgoing) wandert entgegengesetzt hinaus, die neue (incoming) rückt
// von dort herein, wohin der Punkt gegangen ist. Beide liegen genau eine Labyrinth-Breite
// bzw. -Höhe auseinander - so treffen Ausgang und Eingang nahtlos aufeinander.
function scrollShifts(settings) {
  const page = currentPage();
  const direction = OUTWARD[page.exit.side];
  const distanceX = direction.x * page.maze.cols * scene.cellSize;
  const distanceY = direction.y * page.maze.rows * scene.cellSize;

  let part = 0;
  if (scene.phase === SCROLLING) {
    const secondsInPhase = scene.clock - scene.phaseStartedAt;
    part = settings.scrollSeconds > 0 ? easeInOut(Math.min(1, secondsInPhase / settings.scrollSeconds)) : 1;
  }

  // Auf ganze Pixel gerundet, damit die Wände beim Schieben nicht flimmern
  const outgoing = { x: Math.round(-distanceX * part), y: Math.round(-distanceY * part) };
  const incoming = { x: outgoing.x + distanceX, y: outgoing.y + distanceY };
  return { outgoing, incoming };
}

// Legt alle Wände einer Seite als Linien in den Pfad von `context`
// (Ursprung = linke obere Ecke des Labyrinths), mit Lücken an Eingang und Ausgang.
function traceWalls(context, page) {
  const { maze } = page;
  const { cellSize } = scene;

  const isOpening = (x, y, side) =>
    [page.entrance, page.exit].some(
      (opening) => opening.side === side && opening.cell.x === x && opening.cell.y === y
    );
  const wall = (x1, y1, x2, y2) => {
    context.moveTo(x1 * cellSize, y1 * cellSize);
    context.lineTo(x2 * cellSize, y2 * cellSize);
  };

  context.beginPath();
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
}

// Zeichnet alle Wände einer Seite als Striche, um `shift` Pixel nach rechts unten
// (negativ: nach links oben) versetzt.
function strokeWalls(context, page, color, lineWidth, opacity, shift) {
  context.save();
  context.translate(shift, shift);
  traceWalls(context, page);
  context.strokeStyle = color;
  context.lineWidth = lineWidth;
  context.globalAlpha = opacity;
  context.stroke();
  context.restore();
}

// Zeichnet die Wände mit ihrem Schlagschatten nach rechts unten.
function strokeWallsWithShadow(context, page, settings, pixelRatio) {
  context.save();
  traceWalls(context, page);
  context.shadowColor = settings.shadowColor;
  // Schatten-Angaben rechnet der Browser in Geräte-Pixeln, deshalb von Hand mit pixelRatio malnehmen.
  context.shadowOffsetX = settings.shadowOffset * pixelRatio;
  context.shadowOffsetY = settings.shadowOffset * pixelRatio;
  context.shadowBlur = settings.shadowBlur * pixelRatio;
  context.strokeStyle = settings.wallColor;
  context.lineWidth = settings.wallWidth;
  // Die Schattenstärke ist die Deckkraft des Schattens. Der Schatten erbt die Deckkraft
  // des Strichs - die dadurch halbdurchsichtige Wand wird gleich danach deckend übermalt.
  context.globalAlpha = settings.shadowStrength;
  context.stroke();
  context.restore();
}

// Alles, was das Aussehen der Wände bestimmt, als ein Text. Ändert sich dieser Text,
// muss das Wandbild neu gezeichnet werden.
function wallLookOf(settings) {
  return [
    settings.wallWidth, settings.wallColor, settings.shadowColor, settings.shadowOffset,
    settings.shadowBlur, settings.shadowStrength, settings.edgeLight,
    scene.cellSize, window.devicePixelRatio,
  ].join("|");
}

// Zeichnet die Wände einer Seite samt Schlagschatten auf ein eigenes, unsichtbares Canvas.
//
// Warum der Umweg: Ein Schatten über tausende Wandstücke ist die mit Abstand teuerste
// Zeichenoperation. Sie passiert so nur einmal pro Seite (und wenn ein Wand-Regler
// bewegt wird) statt 60-mal pro Sekunde; pro Bild wird nur noch das fertige Bild kopiert.
//
// Die Wände entstehen in Schichten, von unten nach oben:
//   1. Wand in voller Stärke mit Schlagschatten
//   2. dieselbe Wand in Weiß, etwas nach links oben versetzt  -> helle Kante zum Licht hin
//   3. dieselbe Wand in Schwarz, etwas nach rechts unten versetzt -> dunkle Kante vom Licht weg
//   4. die Wand etwas schmaler in ihrer Farbe: deckt alles zu bis auf die beiden Kanten
// Dadurch wirken die Wände wie Klötze mit abgeschrägter Kante.
//
// Das Bild ist ringsum um `padding` größer als das Labyrinth, damit der Schatten der
// Außenwand nicht abgeschnitten wird.
function renderWallImage(page, settings) {
  const pixelRatio = window.devicePixelRatio || 1;
  const padding = Math.ceil(settings.wallWidth + settings.shadowOffset + 2 * settings.shadowBlur);
  const width = page.maze.cols * scene.cellSize + 2 * padding;
  const height = page.maze.rows * scene.cellSize + 2 * padding;

  const image = document.createElement("canvas");
  image.width = width * pixelRatio;
  image.height = height * pixelRatio;
  const context = image.getContext("2d");
  context.scale(pixelRatio, pixelRatio);
  context.translate(padding, padding);
  context.lineCap = "square";

  const edgeWidth = Math.max(1, Math.round(settings.wallWidth / 5));
  const innerWidth = settings.wallWidth - 2 * edgeWidth;
  const hasRoomForEdges = innerWidth >= 1;

  strokeWallsWithShadow(context, page, settings, pixelRatio);
  strokeWalls(context, page, settings.wallColor, settings.wallWidth, 1, 0);
  if (hasRoomForEdges) {
    strokeWalls(context, page, "#ffffff", innerWidth, settings.edgeLight, -edgeWidth);
    strokeWalls(context, page, "#000000", innerWidth, settings.edgeLight, +edgeWidth);
    strokeWalls(context, page, settings.wallColor, innerWidth, 1, 0);
  }

  return { image, padding, width, height, look: wallLookOf(settings) };
}

// Das fertige Wandbild einer Seite. Wird beim ersten Mal gezeichnet und dann aufgehoben,
// bis sich das Aussehen der Wände ändert.
function wallImageOf(pageIndex, settings) {
  const cached = scene.wallImages.get(pageIndex);
  if (cached && cached.look === wallLookOf(settings)) return cached;

  const fresh = renderWallImage(scene.pages[pageIndex], settings);
  scene.wallImages.set(pageIndex, fresh);
  return fresh;
}

// Zeichnet das Wandbild der nächsten Seite schon vorab. Das dauert einige Hundertstel-
// sekunden; erst beim Seitenwechsel erledigt, würde dessen erstes Bild ruckeln.
function prepareNextWallImage(settings) {
  if (hasNextPage()) wallImageOf(scene.pageIndex + 1, settings);
}

// Wirft die Wandbilder von Seiten weg, die nicht mehr zu sehen sind (spart Speicher:
// jedes Bild ist so groß wie der Bildschirm). Gebraucht werden die aktuelle und die nächste Seite.
function forgetUnneededWallImages() {
  for (const pageIndex of scene.wallImages.keys()) {
    const isNeeded = pageIndex === scene.pageIndex || pageIndex === scene.pageIndex + 1;
    if (!isNeeded) scene.wallImages.delete(pageIndex);
  }
}

function drawWalls(pageIndex, settings) {
  const { image, padding, width, height } = wallImageOf(pageIndex, settings);
  ctx.drawImage(image, scene.offsetX - padding, scene.offsetY - padding, width, height);
}

// Wie hell ein gelaufener Schritt gerade noch leuchtet, als Stufe von 0 bis BRIGHTNESS_LEVELS.
// Frisch gelaufen leuchtet er `holdSeconds` lang voll, danach fällt die Helligkeit
// über `fadeSeconds` auf die Rest-Helligkeit.
function brightnessLevelOf(step, settings) {
  const walkedAt = scene.walkedAt[step];
  const isStillBeingWalked = walkedAt === undefined;
  if (isStillBeingWalked) return BRIGHTNESS_LEVELS;

  const secondsFading = scene.clock - walkedAt - settings.holdSeconds;
  let brightness = 1;
  if (secondsFading > 0) {
    const fadedPart = settings.fadeSeconds > 0 ? secondsFading / settings.fadeSeconds : 1;
    brightness = Math.max(settings.restBrightness, 1 - fadedPart);
  }
  return Math.ceil(brightness * BRIGHTNESS_LEVELS);
}

// Zeichnet von der schon gelaufenen Route die Wegstücke einer Art und einer Helligkeitsstufe.
//
// Jedes Wegstück wird um eine halbe Spurbreite gegen die Laufrichtung versetzt gezeichnet
// (mit stumpfen Enden). So schließen aufeinanderfolgende Stücke lückenlos und ohne
// Überlappung aneinander an, auch um die Ecke. Würden sie sich überlappen, entstünden
// beim Ausblenden an jedem Stufenwechsel dunklere Knoten (halbdurchsichtig auf halbdurchsichtig).
function strokeWalkedSegments(kind, level, levelOfStep, settings) {
  const route = currentPage().route;
  const lastStep = Math.min(Math.ceil(scene.progress), route.length - 1);
  const halfWidthInCells = settings.trailWidth / 2 / scene.cellSize;

  ctx.beginPath();
  for (let step = 1; step <= lastStep; step++) {
    if (route[step].kind !== kind || levelOfStep[step] !== level) continue;
    const start = route[step - 1];
    const isStillWalking = step > scene.progress;
    const end = isStillWalking ? positionAt(scene.progress) : route[step];
    const backX = (route[step].x - start.x) * halfWidthInCells;
    const backY = (route[step].y - start.y) * halfWidthInCells;

    const from = centerOf({ x: start.x - backX, y: start.y - backY });
    const to = centerOf({ x: end.x - backX, y: end.y - backY });
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
  }
  ctx.stroke();
}

// Zeichnet die Umlaut-Punkte einer Helligkeitsstufe, bei denen der Lichtpunkt schon war.
function fillUmlautDots(level, levelOfStep, settings) {
  const route = currentPage().route;
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
  const levelOfStep = currentPage().route.map((_, step) => brightnessLevelOf(step, settings));

  ctx.save();
  ctx.strokeStyle = settings.trailColor;
  ctx.fillStyle = settings.trailColor;
  ctx.lineWidth = settings.trailWidth;
  ctx.lineCap = "butt";

  // Verbindungen zuerst, damit die Buchstaben darüber liegen
  for (let level = 1; level <= BRIGHTNESS_LEVELS; level++) {
    ctx.globalAlpha = (level / BRIGHTNESS_LEVELS) * settings.connectorOpacity;
    strokeWalkedSegments(CONNECTOR, level, levelOfStep, settings);
  }

  ctx.shadowColor = settings.trailColor;
  ctx.shadowBlur = settings.glow;
  for (let level = 1; level <= BRIGHTNESS_LEVELS; level++) {
    ctx.globalAlpha = level / BRIGHTNESS_LEVELS;
    strokeWalkedSegments(LETTER, level, levelOfStep, settings);
    fillUmlautDots(level, levelOfStep, settings);
  }
  ctx.restore();
}

// Der Weg, der noch vor dem Lichtpunkt liegt (wie die gestrichelte Linie in der Skizze).
function drawPlannedPath(settings) {
  const route = currentPage().route;
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

// Der Lichtpunkt: ein leuchtender Punkt, innen fast weiß, zum Rand hin in seiner Farbe.
function drawDot(settings) {
  const position = centerOf(positionAt(scene.progress));
  const radius = scene.cellSize * 0.3;

  const glowingBall = ctx.createRadialGradient(position.x, position.y, 0, position.x, position.y, radius);
  glowingBall.addColorStop(0, "#ffffff");
  glowingBall.addColorStop(0.25, "#ffffff");
  glowingBall.addColorStop(1, settings.dotColor);

  ctx.save();
  ctx.fillStyle = glowingBall;
  ctx.shadowColor = settings.dotColor;
  ctx.shadowBlur = scene.cellSize;
  ctx.beginPath();
  ctx.arc(position.x, position.y, radius, 0, 2 * Math.PI);
  ctx.fill();
  ctx.restore();
}

// Zeichnet Spur und Lichtpunkt der aktuellen Seite, beschnitten auf die Labyrinth-Fläche:
// so taucht der Punkt am Eingang auf und verschwindet am Ausgang.
function drawTrailAndDot(settings) {
  const { maze } = currentPage();

  ctx.save();
  ctx.beginPath();
  ctx.rect(scene.offsetX, scene.offsetY, maze.cols * scene.cellSize, maze.rows * scene.cellSize);
  ctx.clip();
  if (settings.showPlannedPath) drawPlannedPath(settings);
  drawTrail(settings);
  if (scene.phase === WRITING) drawDot(settings);
  ctx.restore();
}

// Zeichnet eine Labyrinth-Seite, um `shift` Pixel verschoben (für den Seitenwechsel).
// Spur und Lichtpunkt gibt es nur auf der aktuellen Seite.
function drawPage(pageIndex, shift, settings) {
  ctx.save();
  ctx.translate(shift.x, shift.y);
  drawWalls(pageIndex, settings);
  if (pageIndex === scene.pageIndex) drawTrailAndDot(settings);
  ctx.restore();
}

// Ein komplettes Bild: die aktuelle Seite und - während des Seitenwechsels - die nächste.
function drawScene(settings) {
  ctx.fillStyle = settings.backgroundColor;
  ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);

  const shifts = scrollShifts(settings);
  drawPage(scene.pageIndex, shifts.outgoing, settings);
  if (scene.phase === SCROLLING) drawPage(scene.pageIndex + 1, shifts.incoming, settings);
}

// Läuft einmal pro Bildschirm-Bild: führt die Animation fort und zeichnet neu.
// Gezeichnet wird nur, wenn sich etwas bewegt oder ein Regler etwas geändert hat.
function onAnimationFrame(now) {
  const settings = readSettings();
  const longestPause = 0.1; // verhindert einen Riesensprung, wenn der Tab im Hintergrund war
  const secondsSinceLastFrame =
    scene.lastFrameTime === null ? 0 : Math.min(longestPause, (now - scene.lastFrameTime) / 1000);
  scene.lastFrameTime = now;

  stepAnimation(secondsSinceLastFrame, settings);

  if (scene.phase !== FINISHED || scene.needsRedraw) {
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
  document.getElementById("skipPage").addEventListener("click", () => {
    if (scene.phase === WRITING) advanceDot(Infinity);
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
