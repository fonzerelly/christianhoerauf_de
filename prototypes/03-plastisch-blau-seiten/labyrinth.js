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
//
// Passt der Text nicht in ein Raster, entstehen mehrere Seiten - jede ein eigenes
// Labyrinth. Der Eingang einer Folgeseite liegt dem Ausgang der vorigen genau gegenüber.

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

const OPPOSITE_SIDE = { left: "right", right: "left", top: "bottom", bottom: "top" };

// Wie viel Platz rund um den Textblock mindestens frei bleibt.
// Neben dem Text: eine Spalte für die Zeilenwechsel, eine für das Tor, eine Luft zum Rand.
// Über und unter dem Text: zwei Zeilen, durch die An- und Ablauf am Text vorbeikommen.
const FREE_COLS_BESIDE_TEXT = 3;
const FREE_ROWS_AROUND_TEXT = 2;

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

// Wie viele Zeichen in eine Zeile und wie viele Zeilen auf eine Seite passen.
// maxLinesPerPage ist die Obergrenze aus dem Regler (zum Ausprobieren der Mehrseitigkeit).
function textCapacity(cols, rows, maxLinesPerPage) {
  const usableCols = cols - 2 * FREE_COLS_BESIDE_TEXT;
  const usableRows = rows - 2 * FREE_ROWS_AROUND_TEXT;
  // "+ 1": hinter dem letzten Buchstaben entfällt der Abstand, unter der letzten Zeile der Rückweg
  const charsPerLine = Math.max(1, Math.floor((usableCols + 1) / CHAR_ADVANCE));
  const fittingLines = Math.max(1, Math.floor((usableRows + 1) / LINE_ADVANCE));
  return { charsPerLine, linesPerPage: Math.max(1, Math.min(fittingLines, maxLinesPerPage)) };
}

// Verteilt die Textzeilen auf Seiten. Ein leerer Text ergibt eine Seite mit einer leeren Zeile.
function splitIntoPages(lines, linesPerPage) {
  const pages = [];
  for (let first = 0; first < lines.length; first += linesPerPage) {
    pages.push(lines.slice(first, first + linesPerPage));
  }
  return pages.length > 0 ? pages : [[" "]];
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

// Der Eingang der allerersten Seite: links, oben oder unten - oben/unten in der linken Hälfte.
function pickFirstEntrance(sideWish, cols, rows, random) {
  const side = sideWish === "random" ? pickRandom(["left", "top", "bottom"], random) : sideWish;
  const leftHalf = { min: 1, max: Math.floor(cols / 2) - 1 };
  return { cell: pickBorderCell(side, cols, rows, leftHalf, random), side };
}

// Der Eingang einer Folgeseite: am gegenüberliegenden Rand genau dort, wo der Lichtpunkt
// die vorige Seite verlassen hat (gleiche Zeile bzw. gleiche Spalte). So wirkt der
// Seitenwechsel wie ein durchgehender Weg.
function entranceOppositeOf(exit, cols, rows) {
  const side = OPPOSITE_SIDE[exit.side];
  const cell = { x: exit.cell.x, y: exit.cell.y };
  if (side === "left") cell.x = 0;
  if (side === "right") cell.x = cols - 1;
  if (side === "top") cell.y = 0;
  if (side === "bottom") cell.y = rows - 1;
  return { cell, side };
}

// In welchen Spalten ein Ausgang oben oder unten liegen darf: in der rechten Hälfte
// (Leserichtung) und - falls der Eingang am selben Rand liegt - rechts vom Eingang,
// sonst müssten sich An- und Ablauf kreuzen. Die Eckspalten bleiben frei, damit der
// passende Eingang der nächsten Seite auf jeden Fall noch ein Anlauf-Revier bekommt.
// Ist min größer als max, gibt es an diesem Rand keinen möglichen Ausgang.
function exitColumnRange(side, entrance, cols) {
  const range = { min: Math.floor(cols / 2), max: cols - 2 };
  if (entrance.side === side) range.min = Math.max(range.min, entrance.cell.x + 1);
  return range;
}

// Wählt Rand und Zelle des Ausgangs. Ein gewünschter Rand, an dem (wegen des Eingangs)
// kein Platz ist, wird übergangen; rechts geht immer.
function pickExit(sideWish, entrance, cols, rows, random) {
  const hasRoom = (side) => {
    const range = exitColumnRange(side, entrance, cols);
    return side === "right" || range.min <= range.max;
  };
  const wishedSides = sideWish === "random" ? ["right", "top", "bottom"] : [sideWish];
  const possibleSides = wishedSides.filter(hasRoom);
  const side = possibleSides.length > 0 ? pickRandom(possibleSides, random) : "right";
  return { cell: pickBorderCell(side, cols, rows, exitColumnRange(side, entrance, cols), random), side };
}

// Die Trennspalte im Streifen über (side = "top") oder unter (side = "bottom") dem Text:
// links von ihr gehört der Streifen dem Anlauf, ab ihr dem Ablauf.
//
// Normalerweise ist das die Mitte. Liegt der Eingang an diesem Rand, weicht die
// Trennspalte nach rechts aus, bis er im Anlauf-Revier liegt; liegt der Ausgang an
// diesem Rand, weicht sie nach links aus. Beides zugleich geht, weil exitColumnRange
// den Ausgang immer rechts vom Eingang hält.
function dividingColumn(side, entrance, exit, cols) {
  let column = Math.floor(cols / 2);
  if (entrance.side === side) column = Math.max(column, entrance.cell.x + 1);
  if (exit.side === side) column = Math.min(column, exit.cell.x);
  return column;
}

// Teilt alle Zellen in drei Reviere, damit sich Anlauf, Text und Ablauf nie kreuzen.
//
//   +-------------------+---------------+
//   |  Anlauf           |      Ablauf   |   Streifen über dem Text, geteilt an dividingColumn("top")
//   |      +---------------------+      |
//   |      |       T E X T       |      |   links vom Text: Anlauf, rechts vom Text: Ablauf
//   |      +---------------------+      |
//   |  Anlauf                |  Ablauf  |   Streifen unter dem Text, geteilt an dividingColumn("bottom")
//   +------------------------+----------+
//
// Das Text-Revier ist der Textblock plus je eine Spalte Rand (für die Zeilenwechsel).
// Beide äußeren Reviere hängen in sich zusammen: das Anlauf-Revier über die Spalte ganz
// links, das Ablauf-Revier über die Spalte ganz rechts. Deshalb gibt es in jedem immer einen Weg.
function createTerritories(block, cols, entrance, exit) {
  const dividingColumnAbove = dividingColumn("top", entrance, exit, cols);
  const dividingColumnBelow = dividingColumn("bottom", entrance, exit, cols);

  const isText = ({ x, y }) =>
    x >= block.left - 1 && x <= block.right + 1 && y >= block.top && y <= block.bottom;
  const isLeftOfDivide = ({ x, y }) => {
    if (y < block.top) return x < dividingColumnAbove;
    if (y > block.bottom) return x < dividingColumnBelow;
    return x < block.left;
  };

  return {
    isText,
    isApproach: (cell) => !isText(cell) && isLeftOfDivide(cell),
    isLeave: (cell) => !isText(cell) && !isLeftOfDivide(cell),
  };
}

// Baut den kompletten Weg des Lichtpunkts über eine Seite: von außerhalb durch den Eingang,
// in Windungen zum Text, durch alle Buchstaben, in Windungen zum Ausgang und hinaus.
// entrance und exit sind { cell, side }.
function buildRoute(lines, cols, rows, entrance, exit, random, detour) {
  const block = layoutTextBlock(lines, cols, rows);
  const firstLaneRow = block.top + GLYPH_HEIGHT;
  const lastLaneRow = block.bottom;
  const gateIn = { x: block.left - 2, y: firstLaneRow };
  const gateOut = { x: block.right + 2, y: lastLaneRow };

  const territories = createTerritories(block, cols, entrance, exit);
  const approach = findWindingPath(cols, rows, territories.isApproach, entrance.cell, gateIn, random, detour);
  const leave = findWindingPath(cols, rows, territories.isLeave, gateOut, exit.cell, random, detour);

  const route = [];
  const addConnector = (cell) => route.push({ x: cell.x, y: cell.y, kind: CONNECTOR });

  for (let distance = STEPS_OUTSIDE; distance >= 1; distance--) {
    addConnector(cellOutside(entrance.cell, entrance.side, distance));
  }
  approach.forEach(addConnector);
  appendTextRoute(route, lines, cols, block);
  leave.slice(1).forEach(addConnector); // das Tor selbst ist schon das Routenende
  for (let distance = 1; distance <= STEPS_OUTSIDE; distance++) {
    addConnector(cellOutside(exit.cell, exit.side, distance));
  }

  return route;
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

// Erzeugt eine Labyrinth-Seite für die übergebenen Textzeilen: Ausgang wählen,
// Route bauen, freibrechen, den Rest wachsen lassen.
function generatePage(lines, cols, rows, entrance, random, options) {
  const exit = pickExit(options.exitSide, entrance, cols, rows, random);
  const route = buildRoute(lines, cols, rows, entrance, exit, random, options.detour);

  const maze = createEmptyMaze(cols, rows);
  carveRoute(maze, route);
  growMaze(maze, visitedCells(maze), random, options.windiness);

  return { maze, route, entrance, exit, lines };
}

// Der Einstieg: erzeugt für einen Text so viele Labyrinth-Seiten, wie er braucht.
//
// options: windiness (Charakter der Füll-Gänge), detour (Umwege bei An- und Ablauf),
//          entranceSide: "left" | "top" | "bottom" | "random"   (gilt für die erste Seite)
//          exitSide: "right" | "top" | "bottom" | "random"      (gilt für jede Seite)
//          maxLinesPerPage: Obergrenze für die Zeilen einer Seite
//
// Jede Folgeseite beginnt dort, wo die vorige aufgehört hat: ihr Eingang liegt dem
// Ausgang der vorigen Seite genau gegenüber.
// Liefert eine Liste von Seiten { maze, route, entrance, exit, lines }.
function generateMessagePages(text, cols, rows, seed, options) {
  const random = createRandom(seed);
  const capacity = textCapacity(cols, rows, options.maxLinesPerPage);
  const allLines = wrapText(normalizeText(text), capacity.charsPerLine);

  const pages = [];
  for (const lines of splitIntoPages(allLines, capacity.linesPerPage)) {
    const previousPage = pages[pages.length - 1];
    const entrance = previousPage
      ? entranceOppositeOf(previousPage.exit, cols, rows)
      : pickFirstEntrance(options.entranceSide, cols, rows, random);
    pages.push(generatePage(lines, cols, rows, entrance, random, options));
  }
  return pages;
}
