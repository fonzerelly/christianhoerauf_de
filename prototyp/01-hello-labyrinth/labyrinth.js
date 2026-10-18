// Das Labyrinth mit versteckter Nachricht.
//
// Grundidee: Wir suchen NICHT nach einem Labyrinth, das zufällig die Nachricht enthält.
// Wir legen zuerst den Weg des Lichtpunkts fest (die Route durch alle Buchstaben) und
// lassen danach das restliche Labyrinth um diesen Weg herum wachsen.

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

// Bricht die Wand zwischen zwei benachbarten Zellen heraus.
function carvePassage(maze, from, to) {
  if (to.x === from.x + 1) maze.openRight[from.y][from.x] = true;
  if (to.x === from.x - 1) maze.openRight[to.y][to.x] = true;
  if (to.y === from.y + 1) maze.openDown[from.y][from.x] = true;
  if (to.y === from.y - 1) maze.openDown[to.y][to.x] = true;
  maze.visited[from.y][from.x] = true;
  maze.visited[to.y][to.x] = true;
}

// Verlängert die Route Zelle für Zelle in gerader Linie bis zum Ziel.
// isLetter sagt, ob dieses Wegstück zu einem Buchstaben gehört oder nur verbindet.
// Das Ziel muss in derselben Zeile oder Spalte liegen wie das aktuelle Routenende.
function walkTo(route, targetX, targetY, isLetter) {
  let { x, y } = route[route.length - 1];
  while (x !== targetX || y !== targetY) {
    x += Math.sign(targetX - x);
    y += Math.sign(targetY - y);
    route.push({ x, y, isLetter });
  }
}

// Baut den kompletten Weg des Lichtpunkts: Eingang links -> alle Buchstaben -> Ausgang rechts.
//
// Aufbau einer Textzeile (von oben nach unten):
//   5 Zeilen Buchstaben
//   1 Zeile Verbindungsspur: hier läuft der Punkt von Buchstabe zu Buchstabe
//   1 Zeile Rückweg: hier läuft er nach links zurück zum Anfang der nächsten Textzeile
function buildRoute(lines, cols, rows) {
  if (lines.length === 0) lines = [""];

  const blockHeight = lines.length * LINE_ADVANCE - 1;
  const blockTop = Math.floor((rows - blockHeight) / 2);
  const laneRowOf = (lineIndex) => blockTop + lineIndex * LINE_ADVANCE + GLYPH_HEIGHT;
  const currentX = () => route[route.length - 1].x;

  const route = [{ x: 0, y: laneRowOf(0), isLetter: false }];

  lines.forEach((line, lineIndex) => {
    const lineWidth = line.length * CHAR_ADVANCE - 1;
    const lineLeft = Math.floor((cols - lineWidth) / 2);
    const glyphTop = blockTop + lineIndex * LINE_ADVANCE;
    const laneRow = laneRowOf(lineIndex);

    if (lineIndex > 0) {
      const returnRow = laneRowOf(lineIndex - 1) + 1;
      const descentCol = lineLeft - 1;
      walkTo(route, currentX(), returnRow, false);
      walkTo(route, descentCol, returnRow, false);
      walkTo(route, descentCol, laneRow, false);
    }

    line.split("").forEach((char, charIndex) => {
      const waypoints = GLYPHS[char];
      if (!waypoints) return; // Leerzeichen: die Spur läuft einfach weiter

      const glyphLeft = lineLeft + charIndex * CHAR_ADVANCE;
      const entryX = glyphLeft + waypoints[0][0];
      walkTo(route, entryX, laneRow, false);
      waypoints.forEach(([x, y], waypointIndex) => {
        const isFirstStepUpFromLane = waypointIndex === 0;
        walkTo(route, glyphLeft + x, glyphTop + y, !isFirstStepUpFromLane);
      });
      walkTo(route, currentX(), laneRow, false);
    });
  });

  walkTo(route, cols - 1, laneRowOf(lines.length - 1), false);
  return route;
}

// Bricht entlang der Route alle Wände heraus.
function carveRoute(maze, route) {
  for (let step = 1; step < route.length; step++) {
    carvePassage(maze, route[step - 1], route[step]);
  }
}

function unvisitedNeighbours(maze, cell) {
  const candidates = [
    { x: cell.x + 1, y: cell.y },
    { x: cell.x - 1, y: cell.y },
    { x: cell.x, y: cell.y + 1 },
    { x: cell.x, y: cell.y - 1 },
  ];
  return candidates.filter(
    ({ x, y }) => x >= 0 && x < maze.cols && y >= 0 && y < maze.rows && !maze.visited[y][x]
  );
}

function shuffle(list, random) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

// Füllt alle noch zugemauerten Zellen mit Gängen ("Growing Tree"-Algorithmus).
//
// Start sind die Zellen der Route. Wiederholt wird eine schon erschlossene Zelle
// gewählt und von ihr aus ein Gang in eine noch unberührte Nachbarzelle gebrochen.
// Weil nur in unberührte Zellen gegraben wird, entstehen keine neuen Abkürzungen:
// die Route bleibt der Weg vom Eingang zum Ausgang.
//
// windiness (0..1) bestimmt den Charakter:
//   nahe 1 -> meist die zuletzt erschlossene Zelle: lange, gewundene Gänge
//   nahe 0 -> meist eine zufällige Zelle: viele kurze Sackgassen
function growMaze(maze, random, windiness) {
  const active = [];
  for (let y = 0; y < maze.rows; y++) {
    for (let x = 0; x < maze.cols; x++) {
      if (maze.visited[y][x]) active.push({ x, y });
    }
  }
  shuffle(active, random);

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

// Erzeugt Labyrinth und Route für einen Text.
// hint ist ein Hinweis für den Benutzer, falls der Text nicht ins Raster passt.
function generateMessageMaze(text, cols, rows, seed, windiness) {
  const maxCharsPerLine = Math.max(1, Math.floor((cols - 1) / CHAR_ADVANCE));
  const maxLines = Math.max(1, Math.floor((rows + 1) / LINE_ADVANCE));

  const allLines = wrapText(normalizeText(text), maxCharsPerLine);
  const lines = allLines.slice(0, maxLines);
  const hint =
    allLines.length > maxLines
      ? "Der Text passt nicht ganz ins Raster: Zellgröße verkleinern oder Text kürzen."
      : "";

  const maze = createEmptyMaze(cols, rows);
  const route = buildRoute(lines, cols, rows);
  carveRoute(maze, route);
  growMaze(maze, createRandom(seed), windiness);

  return { maze, route, hint };
}
