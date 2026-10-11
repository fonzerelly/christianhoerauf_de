// Das Labyrinth mit versteckter Nachricht.
//
// Grundidee: Wir suchen NICHT nach einem Labyrinth, das zufällig die Nachricht enthält.
// Wir legen zuerst den Weg des Lichtpunkts fest (die Route durch alle Buchstaben) und
// lassen danach das restliche Labyrinth um diesen Weg herum wachsen.
//
// Die Route besteht aus drei Teilen:
//   1. Anlauf:  vom Eingang am Rand in Windungen bis links neben den Text
//   2. Text:    durch alle Buchstaben
//   3. Ablauf:  von rechts neben dem Text in Windungen zum Ausgang am Rand

// Arten von Wegstücken. Sie entscheiden, wie die Leuchtspur gezeichnet wird.
const LETTER = "letter"; // gehört zu einem Buchstaben: leuchtet kräftig
const CONNECTOR = "connector"; // verbindet nur: blass
const SILENT = "silent"; // Hüpfer zu einem Umlaut-Punkt: gar keine Spur

// Wie viele Zellen der Lichtpunkt vor dem Eingang startet und hinter dem Ausgang verschwindet.
const STEPS_OUTSIDE = 2;

const OUTWARD = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  top: { x: 0, y: -1 },
  bottom: { x: 0, y: 1 },
};

// Zufallsgenerator mit Startwert (Mulberry32): gleicher Seed -> gleiche Zahlenfolge
// -> gleiches Labyrinth. Die Bit-Operationen sind der Algorithmus selbst und
// deshalb nicht lesbarer zu bekommen.
function createRandom(seed) {
  let state = seed >>> 0;
  return function random() {
    state = (state + 0x6d2b79f5) >>> 0;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function pickRandom(list, random) {
  return list[Math.floor(random() * list.length)];
}

function randomBetween(min, max, random) {
  return min + Math.floor(random() * (max - min + 1));
}

// Ein Labyrinth, in dem noch jede Zelle rundum zugemauert ist.
// openRight[y][x]: Durchgang von Zelle (x, y) nach rechts, openDown[y][x]: nach unten.
function createEmptyMaze(cols, rows) {
  const emptyGrid = () => Array.from({ length: rows }, () => new Array(cols).fill(false));
  return {
    cols,
    rows,
    openRight: emptyGrid(),
    openDown: emptyGrid(),
    visited: emptyGrid(),
  };
}

function isInside(maze, cell) {
  return cell.x >= 0 && cell.x < maze.cols && cell.y >= 0 && cell.y < maze.rows;
}

// Bricht die Wand zwischen zwei benachbarten Zellen heraus.
function carvePassage(maze, from, to) {
  if (to.x === from.x + 1) maze.openRight[from.y][from.x] = true;
  if (to.x === from.x - 1) maze.openRight[to.y][to.x] = true;
  if (to.y === from.y + 1) maze.openDown[from.y][from.x] = true;
  if (to.y === from.y - 1) maze.openDown[to.y][to.x] = true;
  maze.visited[from.y][from.x] = true;
  maze.visited[to.y][to.x] = true;
}

function neighboursOf(cell) {
  return [
    { x: cell.x + 1, y: cell.y },
    { x: cell.x - 1, y: cell.y },
    { x: cell.x, y: cell.y + 1 },
    { x: cell.x, y: cell.y - 1 },
  ];
}

function unvisitedNeighbours(maze, cell) {
  return neighboursOf(cell).filter((n) => isInside(maze, n) && !maze.visited[n.y][n.x]);
}

// Die Nachbarzellen, zu denen es einen offenen Durchgang gibt.
function connectedNeighbours(maze, cell) {
  return neighboursOf(cell).filter((n) => {
    if (!isInside(maze, n)) return false;
    if (n.x === cell.x + 1) return maze.openRight[cell.y][cell.x];
    if (n.x === cell.x - 1) return maze.openRight[n.y][n.x];
    if (n.y === cell.y + 1) return maze.openDown[cell.y][cell.x];
    return maze.openDown[n.y][n.x];
  });
}

function visitedCells(maze) {
  const cells = [];
  for (let y = 0; y < maze.rows; y++) {
    for (let x = 0; x < maze.cols; x++) {
      if (maze.visited[y][x]) cells.push({ x, y });
    }
  }
  return cells;
}

function shuffle(list, random) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

// Lässt von den Startzellen aus Gänge in alle noch unberührten Zellen wachsen
// ("Growing Tree"-Algorithmus).
//
// Wiederholt wird eine schon erschlossene Zelle gewählt und von ihr aus ein Gang
// in eine noch unberührte Nachbarzelle gebrochen. Weil nur in unberührte Zellen
// gegraben wird, entstehen keine Rundwege und keine Abkürzungen.
//
// windiness (0..1) bestimmt den Charakter:
//   nahe 1 -> meist die zuletzt erschlossene Zelle: lange, gewundene Gänge
//   nahe 0 -> meist eine zufällige Zelle: viele kurze Sackgassen
function growMaze(maze, startCells, random, windiness) {
  const active = shuffle([...startCells], random);

  while (active.length > 0) {
    const takeNewest = random() < windiness;
    const index = takeNewest ? active.length - 1 : Math.floor(random() * active.length);
    const cell = active[index];

    const freeNeighbours = unvisitedNeighbours(maze, cell);
    if (freeNeighbours.length === 0) {
      active.splice(index, 1);
      continue;
    }

    const next = pickRandom(freeNeighbours, random);
    carvePassage(maze, cell, next);
    active.push(next);
  }
}

// Sucht den Weg durch die offenen Gänge eines Labyrinths (Breitensuche).
// Liefert die Zellen von `from` bis `to`, beide eingeschlossen.
function findPathThroughMaze(maze, from, to) {
  const keyOf = (cell) => cell.y * maze.cols + cell.x;
  const cameFrom = new Map([[keyOf(from), null]]);
  const queue = [from];

  while (queue.length > 0 && !cameFrom.has(keyOf(to))) {
    const cell = queue.shift();
    for (const neighbour of connectedNeighbours(maze, cell)) {
      if (cameFrom.has(keyOf(neighbour))) continue;
      cameFrom.set(keyOf(neighbour), cell);
      queue.push(neighbour);
    }
  }

  const path = [];
  for (let cell = to; cell; cell = cameFrom.get(keyOf(cell))) {
    path.unshift(cell);
  }
  return path;
}

// Erfindet einen gewundenen Weg von `from` nach `to`, der nur erlaubte Zellen benutzt.
//
// Trick: In einem Wegwerf-Labyrinth über den erlaubten Zellen gibt es zwischen zwei
// Zellen genau einen Weg - und der sieht von selbst nach Labyrinth aus.
// detour (0..1): nahe 0 eher direkt, nahe 1 lange Umwege.
function findWindingPath(cols, rows, isAllowed, from, to, random, detour) {
  const scratchMaze = createEmptyMaze(cols, rows);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (!isAllowed({ x, y })) scratchMaze.visited[y][x] = true; // gilt damit als belegt
    }
  }
  scratchMaze.visited[from.y][from.x] = true;
  growMaze(scratchMaze, [from], random, detour);
  return findPathThroughMaze(scratchMaze, from, to);
}

// Berechnet, wo der Textblock im Raster liegt (zentriert).
// left/right/top/bottom sind die äußersten Zellen des Blocks.
function layoutTextBlock(lines, cols, rows) {
  const longestLine = Math.max(...lines.map((line) => line.length));
  const width = longestLine * CHAR_ADVANCE - 1;
  const height = lines.length * LINE_ADVANCE - 1; // der Rückweg unter der letzten Zeile entfällt
  const left = Math.floor((cols - width) / 2);
  const top = Math.floor((rows - height) / 2);
  return { left, right: left + width - 1, top, bottom: top + height - 1 };
}

// Verlängert die Route Zelle für Zelle in gerader Linie bis zum Ziel.
// Das Ziel muss in derselben Zeile oder Spalte liegen wie das aktuelle Routenende.
function walkTo(route, targetX, targetY, kind) {
  let { x, y } = route[route.length - 1];
  while (x !== targetX || y !== targetY) {
    x += Math.sign(targetX - x);
    y += Math.sign(targetY - y);
    route.push({ x, y, kind });
  }
}

// Hängt den Weg durch einen Buchstaben an. Die Route steht dabei schon in der
// Verbindungsspur genau unter dem ersten Wegpunkt.
function appendGlyph(route, waypoints, glyphLeft, glyphTop) {
  waypoints.forEach(([x, y, marker], index) => {
    const isStepUpFromLane = index === 0;
    const leadsToDot = marker === DOT;
    const comesFromDot = index > 0 && waypoints[index - 1][2] === DOT;

    let kind = LETTER;
    if (isStepUpFromLane) kind = CONNECTOR;
    if (leadsToDot || comesFromDot) kind = SILENT;

    walkTo(route, glyphLeft + x, glyphTop + y, kind);
    if (leadsToDot) route[route.length - 1].isDot = true;
  });
}

// Hängt den Weg durch den ganzen Text an. Die Route muss am "Tor" links neben
// dem Text enden und endet danach am Tor rechts neben dem Text.
//
// Aufbau einer Textzeile (von oben nach unten):
//   5 Zeilen Buchstaben
//   1 Zeile Verbindungsspur: hier läuft der Punkt von Buchstabe zu Buchstabe
//   1 Zeile Rückweg: hier läuft er nach links zurück zum Anfang der nächsten Textzeile
function appendTextRoute(route, lines, cols, block) {
  const laneRowOf = (lineIndex) => block.top + lineIndex * LINE_ADVANCE + GLYPH_HEIGHT;
  const currentX = () => route[route.length - 1].x;

  lines.forEach((line, lineIndex) => {
    const lineWidth = line.length * CHAR_ADVANCE - 1;
    const lineLeft = Math.floor((cols - lineWidth) / 2);
    const glyphTop = block.top + lineIndex * LINE_ADVANCE;
    const laneRow = laneRowOf(lineIndex);

    if (lineIndex > 0) {
      const returnRow = laneRowOf(lineIndex - 1) + 1;
      const descentCol = lineLeft - 1;
      walkTo(route, currentX(), returnRow, CONNECTOR);
      walkTo(route, descentCol, returnRow, CONNECTOR);
      walkTo(route, descentCol, laneRow, CONNECTOR);
    }

    line.split("").forEach((char, charIndex) => {
      const waypoints = GLYPHS[char];
      if (!waypoints) return; // Leerzeichen: die Spur läuft einfach weiter

      const glyphLeft = lineLeft + charIndex * CHAR_ADVANCE;
      walkTo(route, glyphLeft + waypoints[0][0], laneRow, CONNECTOR);
      appendGlyph(route, waypoints, glyphLeft, glyphTop);
      walkTo(route, currentX(), laneRow, CONNECTOR);
    });
  });

  walkTo(route, block.right + 2, laneRowOf(lines.length - 1), CONNECTOR);
}

// Wählt eine Zelle am gewünschten Rand. Bei oben/unten nur innerhalb des Spaltenbereichs.
function pickBorderCell(side, cols, rows, columnRange, random) {
  const column = randomBetween(columnRange.min, columnRange.max, random);
  const row = randomBetween(0, rows - 1, random);
  if (side === "left") return { x: 0, y: row };
  if (side === "right") return { x: cols - 1, y: row };
  if (side === "top") return { x: column, y: 0 };
  return { x: column, y: rows - 1 };
}

// Die Zelle, die `distance` Schritte außerhalb des Rasters vor einer Randzelle liegt.
function cellOutside(borderCell, side, distance) {
  return {
    x: borderCell.x + OUTWARD[side].x * distance,
    y: borderCell.y + OUTWARD[side].y * distance,
  };
}

// Baut den kompletten Weg des Lichtpunkts: von außerhalb durch den Eingang,
// in Windungen zum Text, durch alle Buchstaben, in Windungen zum Ausgang und hinaus.
//
// Damit sich die drei Teile nicht in die Quere kommen, bekommt jeder sein Revier:
//   Anlauf: linke Hälfte des Rasters, Ablauf: rechte Hälfte,
//   Text: der Textblock plus je eine Spalte Rand (dort laufen die Zeilenwechsel).
function buildRoute(lines, cols, rows, entranceSide, exitSide, random, detour) {
  const block = layoutTextBlock(lines, cols, rows);
  const firstLaneRow = block.top + GLYPH_HEIGHT;
  const lastLaneRow = block.bottom;
  const gateIn = { x: block.left - 2, y: firstLaneRow };
  const gateOut = { x: block.right + 2, y: lastLaneRow };

  const middleCol = Math.floor(cols / 2);
  const isTextTerritory = ({ x, y }) =>
    x >= block.left - 1 && x <= block.right + 1 && y >= block.top && y <= block.bottom;
  const isApproachTerritory = (cell) => cell.x < middleCol && !isTextTerritory(cell);
  const isLeaveTerritory = (cell) => cell.x >= middleCol && !isTextTerritory(cell);

  const entranceCell = pickBorderCell(entranceSide, cols, rows, { min: 0, max: gateIn.x }, random);
  const exitCell = pickBorderCell(exitSide, cols, rows, { min: gateOut.x, max: cols - 1 }, random);

  const approach = findWindingPath(cols, rows, isApproachTerritory, entranceCell, gateIn, random, detour);
  const leave = findWindingPath(cols, rows, isLeaveTerritory, gateOut, exitCell, random, detour);

  const route = [];
  const addConnector = (cell) => route.push({ x: cell.x, y: cell.y, kind: CONNECTOR });

  for (let distance = STEPS_OUTSIDE; distance >= 1; distance--) {
    addConnector(cellOutside(entranceCell, entranceSide, distance));
  }
  approach.forEach(addConnector);
  appendTextRoute(route, lines, cols, block);
  leave.slice(1).forEach(addConnector); // das Tor selbst ist schon das Routenende
  for (let distance = 1; distance <= STEPS_OUTSIDE; distance++) {
    addConnector(cellOutside(exitCell, exitSide, distance));
  }

  return {
    route,
    entrance: { cell: entranceCell, side: entranceSide },
    exit: { cell: exitCell, side: exitSide },
  };
}

// Bricht entlang der Route alle Wände heraus. Die Schritte außerhalb des Rasters
// (vor dem Eingang, hinter dem Ausgang) haben keine Wände.
function carveRoute(maze, route) {
  for (let step = 1; step < route.length; step++) {
    const from = route[step - 1];
    const to = route[step];
    if (isInside(maze, from) && isInside(maze, to)) carvePassage(maze, from, to);
  }
}

// Erzeugt Labyrinth und Route für einen Text.
//
// options: windiness (Charakter der Füll-Gänge), detour (Umwege bei An- und Ablauf),
//          entranceSide: "left" | "top" | "bottom" | "random",
//          exitSide: "right" | "top" | "bottom" | "random"
// hint ist ein Hinweis für den Benutzer, falls der Text nicht ins Raster passt.
function generateMessageMaze(text, cols, rows, seed, options) {
  const random = createRandom(seed);

  // Links und rechts bleiben je zwei Spalten frei: eine für die Zeilenwechsel, eine für das Tor.
  const maxCharsPerLine = Math.max(1, Math.floor((cols - 3) / CHAR_ADVANCE));
  const maxLines = Math.max(1, Math.floor((rows + 1) / LINE_ADVANCE));

  const allLines = wrapText(normalizeText(text), maxCharsPerLine);
  let lines = allLines.slice(0, maxLines);
  if (lines.length === 0) lines = [" "];
  const hint =
    allLines.length > maxLines
      ? "Der Text passt nicht ganz ins Raster: Zellgröße verkleinern oder Text kürzen."
      : "";

  const sideOrRandom = (side, choices) => (side === "random" ? pickRandom(choices, random) : side);
  const entranceSide = sideOrRandom(options.entranceSide, ["left", "top", "bottom"]);
  const exitSide = sideOrRandom(options.exitSide, ["right", "top", "bottom"]);

  const maze = createEmptyMaze(cols, rows);
  const { route, entrance, exit } = buildRoute(
    lines, cols, rows, entranceSide, exitSide, random, options.detour
  );
  carveRoute(maze, route);
  growMaze(maze, visitedCells(maze), random, options.windiness);

  return { maze, route, hint, entrance, exit };
}
