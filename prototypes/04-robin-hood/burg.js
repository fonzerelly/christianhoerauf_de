// Die Burg: Boden und Mauern, von oben gesehen.
//
// Alles in dieser Datei wird nur EINMAL pro Labyrinth gemalt, und zwar auf ein
// unsichtbares Canvas (siehe paintBackdrop in seite.js). Pro Bild der Animation
// wird dieses fertige Gemälde nur noch kopiert - Tausende Pflastersteine und
// Zinnen 60-mal pro Sekunde neu zu zeichnen wäre zu langsam.
//
// Alle Zeichenfunktionen bekommen dieselbe Beschreibung der Burg übergeben:
//   castle = {
//     maze, entrance, exit,   // aus generateMessageMaze
//     cellSize,               // Kantenlänge einer Zelle in Pixeln
//     offsetX, offsetY,       // linke obere Ecke des Labyrinths auf dem Canvas
//     wallThickness,          // Dicke der Mauern in Pixeln
//     width, height,          // Größe des ganzen Canvas
//     seed,                   // damit Pflaster und Gras bei gleichem Seed gleich aussehen
//   }

const CASTLE_COLORS = {
  grass: "#6d8c45",
  grassTufts: ["#7b9c50", "#5f7d3b"],
  path: "#b29a6e",
  courtyard: "#8a7c66",
  cobbles: ["#988a72", "#93846b", "#80725c"],
  shadow: "rgba(25, 18, 10, 0.34)",
  wallOutline: "#33302b",
  crenel: "#7b766d", // die Lücke zwischen zwei Zinnen
  merlon: "#e6e1d5", // die Zinne selbst: am höchsten, also am hellsten
  walkway: "#b6b0a3", // der Wehrgang auf der Mauerkrone
  joint: "rgba(55, 50, 43, 0.55)", // Fugen zwischen den Steinplatten
  roof: "#566d90",
  roofShade: "#3d5070",
  roofRidge: "#2a3850",
};

// Größen als Bruchteil der Zellgröße.
const SHADOW_SHIFT = 0.11; // so weit fällt der Schatten nach rechts unten
const MERLONS_PER_CELL = 4;
const CORNER_TOWER_RADIUS = 0.42;
const GATE_TOWER_RADIUS = 0.3;
const GATE_TOWER_SHIFT = 0.14; // Tortürme rücken etwas vom Tor weg, damit die Durchfahrt frei bleibt
const PATH_WIDTH = 0.7;

// Rechnet einen Gitterpunkt (Ecke einer Zelle) in Canvas-Koordinaten um.
function gridPoint(castle, gridX, gridY) {
  return {
    x: castle.offsetX + gridX * castle.cellSize,
    y: castle.offsetY + gridY * castle.cellSize,
  };
}

function isGateAt(castle, x, y, side) {
  return [castle.entrance, castle.exit].some(
    (gate) => gate.side === side && gate.cell.x === x && gate.cell.y === y
  );
}

// Sammelt alle Mauerstücke des Labyrinths. Jedes Stück ist eine Zellkante lang und
// läuft von links nach rechts oder von oben nach unten: { x1, y1, x2, y2 } in Gitterpunkten.
// An Eingang und Ausgang bleibt die Außenmauer offen.
function collectWallSegments(castle) {
  const { maze } = castle;
  const segments = [];
  const wall = (x1, y1, x2, y2) => segments.push({ x1, y1, x2, y2 });

  for (let y = 0; y < maze.rows; y++) {
    for (let x = 0; x < maze.cols; x++) {
      const isLastCol = x === maze.cols - 1;
      const isLastRow = y === maze.rows - 1;
      const hasRightWall = isLastCol ? !isGateAt(castle, x, y, "right") : !maze.openRight[y][x];
      const hasBottomWall = isLastRow ? !isGateAt(castle, x, y, "bottom") : !maze.openDown[y][x];

      if (hasRightWall) wall(x + 1, y, x + 1, y + 1);
      if (hasBottomWall) wall(x, y + 1, x + 1, y + 1);
      if (x === 0 && !isGateAt(castle, x, y, "left")) wall(0, y, 0, y + 1);
      if (y === 0 && !isGateAt(castle, x, y, "top")) wall(x, 0, x + 1, 0);
    }
  }
  return segments;
}

// Zählt für jeden Gitterpunkt, wie viele waagrechte und senkrechte Mauerstücke dort enden.
// Liefert eine Liste { x, y, horizontal, vertical }.
function collectJunctions(segments) {
  const junctions = new Map();
  const countWallEnd = (x, y, isHorizontal) => {
    const key = x + "," + y;
    if (!junctions.has(key)) junctions.set(key, { x, y, horizontal: 0, vertical: 0 });
    junctions.get(key)[isHorizontal ? "horizontal" : "vertical"]++;
  };

  for (const segment of segments) {
    const isHorizontal = segment.y1 === segment.y2;
    countWallEnd(segment.x1, segment.y1, isHorizontal);
    countWallEnd(segment.x2, segment.y2, isHorizontal);
  }
  return [...junctions.values()];
}

// Läuft die Mauer an diesem Gitterpunkt einfach geradeaus durch?
function isStraightRun(junction) {
  const runsAcross = junction.horizontal === 2 && junction.vertical === 0;
  const runsDown = junction.vertical === 2 && junction.horizontal === 0;
  return runsAcross || runsDown;
}

// Endet hier eine Mauer frei im Hof?
function isLooseEnd(junction) {
  return junction.horizontal + junction.vertical === 1;
}

// Die vier Ecken der Außenmauer als Gitterpunkte.
function outerCorners(maze) {
  return [
    { x: 0, y: 0 },
    { x: maze.cols, y: 0 },
    { x: 0, y: maze.rows },
    { x: maze.cols, y: maze.rows },
  ];
}

// Die beiden Stellen links und rechts neben einem Tor, an denen die Tortürme stehen
// (als Gitterpunkte, etwas vom Tor weggerückt).
function gateTowerSpots(castle, gate) {
  const { cell, side } = gate;
  const { cols, rows } = castle.maze;
  if (side === "left" || side === "right") {
    const x = side === "left" ? 0 : cols;
    return [{ x, y: cell.y - GATE_TOWER_SHIFT }, { x, y: cell.y + 1 + GATE_TOWER_SHIFT }];
  }
  const y = side === "top" ? 0 : rows;
  return [{ x: cell.x - GATE_TOWER_SHIFT, y }, { x: cell.x + 1 + GATE_TOWER_SHIFT, y }];
}

// Legt alle Mauerstücke als Linien in den aktuellen Pfad (ohne sie schon zu zeichnen).
// shift verschiebt alles um so viele Pixel nach rechts unten (für den Schatten).
function traceWalls(ctx, castle, segments, shift = 0) {
  ctx.beginPath();
  for (const segment of segments) {
    const from = gridPoint(castle, segment.x1, segment.y1);
    const to = gridPoint(castle, segment.x2, segment.y2);
    ctx.moveTo(from.x + shift, from.y + shift);
    ctx.lineTo(to.x + shift, to.y + shift);
  }
}

function fillDisc(ctx, x, y, radius, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, 2 * Math.PI);
  ctx.fill();
}

// Streut kleine Flecken zufällig über ein Rechteck (Grasbüschel, Pflastersteine).
// Alle Flecken einer Farbe landen in einem gemeinsamen Pfad und werden in einem Rutsch
// gefüllt - jeder Fleck einzeln wäre bei mehreren Tausend Stück merklich langsamer.
function scatterSpots(ctx, area, spotSize, spacing, colors, random) {
  for (const color of colors) {
    ctx.beginPath();
    for (let y = area.top; y < area.top + area.height; y += spacing) {
      for (let x = area.left; x < area.left + area.width; x += spacing) {
        if (random() > 1 / colors.length) continue; // jede Farbe bekommt ihren Anteil der Plätze
        const spotX = x + random() * spacing;
        const spotY = y + random() * spacing;
        ctx.moveTo(spotX + spotSize, spotY);
        ctx.ellipse(spotX, spotY, spotSize, spotSize * 0.75, 0, 0, 2 * Math.PI);
      }
    }
    ctx.fillStyle = color;
    ctx.fill();
  }
}

// Die Wiese rund um die Burg: füllt das ganze Canvas.
function drawGrass(ctx, castle, random) {
  const everything = { left: 0, top: 0, width: castle.width, height: castle.height };
  ctx.fillStyle = CASTLE_COLORS.grass;
  ctx.fillRect(0, 0, castle.width, castle.height);
  scatterSpots(ctx, everything, castle.cellSize * 0.05, castle.cellSize * 0.22, CASTLE_COLORS.grassTufts, random);
}

// Der Sandweg, der von einem Tor nach draußen bis über den Bildrand führt.
function drawPathToGate(ctx, castle, gate) {
  const { cellSize } = castle;
  const insideGate = { x: gate.cell.x + 0.5, y: gate.cell.y + 0.5 };
  const farOutside = cellOutside(insideGate, gate.side, 4);
  const from = gridPoint(castle, insideGate.x, insideGate.y);
  const to = gridPoint(castle, farOutside.x, farOutside.y);

  ctx.strokeStyle = CASTLE_COLORS.path;
  ctx.lineWidth = cellSize * PATH_WIDTH;
  ctx.lineCap = "butt";
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
}

// Der gepflasterte Burghof: die ganze Fläche des Labyrinths.
function drawCourtyard(ctx, castle, random) {
  const { maze, cellSize } = castle;
  const yard = {
    left: castle.offsetX,
    top: castle.offsetY,
    width: maze.cols * cellSize,
    height: maze.rows * cellSize,
  };
  ctx.fillStyle = CASTLE_COLORS.courtyard;
  ctx.fillRect(yard.left, yard.top, yard.width, yard.height);
  scatterSpots(ctx, yard, cellSize * 0.085, cellSize * 0.16, CASTLE_COLORS.cobbles, random);
}

// Der Schatten, den Mauern und Türme auf den Hof werfen (Licht kommt von links oben).
function drawShadows(ctx, castle, segments, towers) {
  const shift = castle.cellSize * SHADOW_SHIFT;
  ctx.save();
  ctx.strokeStyle = CASTLE_COLORS.shadow;
  ctx.lineWidth = castle.wallThickness;
  ctx.lineCap = "square";
  traceWalls(ctx, castle, segments, shift);
  ctx.stroke();
  for (const tower of towers) {
    fillDisc(ctx, tower.x + shift * 1.5, tower.y + shift * 1.5, tower.radius, CASTLE_COLORS.shadow);
  }
  ctx.restore();
}

// Die Mauern selbst, Schicht für Schicht von unten nach oben:
//   1. dunkler Umriss
//   2. die Brüstung in der Farbe der Zinnen-Lücken
//   3. die Zinnen: dieselbe Linie nochmal, aber hell und gestrichelt - jeder Strich
//      ist ein Zinnen-Paar (eine Zinne an jeder Mauerkante)
//   4. der Wehrgang: ein schmalerer Streifen in der Mitte, der die Striche in zwei
//      Zinnen-Reihen teilt
//   5. Fugen quer über den Wehrgang
function drawWallBodies(ctx, castle, segments) {
  const { cellSize, wallThickness } = castle;
  const merlonLength = cellSize / MERLONS_PER_CELL / 2; // Zinne und Lücke sind gleich lang
  const walkwayWidth = wallThickness * 0.48;

  ctx.save();
  traceWalls(ctx, castle, segments);

  ctx.lineCap = "square";
  ctx.strokeStyle = CASTLE_COLORS.wallOutline;
  ctx.lineWidth = wallThickness + 2;
  ctx.stroke();
  ctx.strokeStyle = CASTLE_COLORS.crenel;
  ctx.lineWidth = wallThickness;
  ctx.stroke();

  // Der Versatz legt eine Lücke genau auf jeden Gitterpunkt. So setzt sich das
  // Zinnen-Muster über mehrere Mauerstücke hinweg gleichmäßig fort.
  ctx.lineCap = "butt";
  ctx.setLineDash([merlonLength, merlonLength]);
  ctx.lineDashOffset = merlonLength * 1.5;
  ctx.strokeStyle = CASTLE_COLORS.merlon;
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.lineCap = "square";
  ctx.strokeStyle = CASTLE_COLORS.walkway;
  ctx.lineWidth = walkwayWidth;
  ctx.stroke();

  ctx.lineCap = "butt";
  ctx.setLineDash([1, cellSize / 3 - 1]);
  ctx.lineDashOffset = -cellSize / 6;
  ctx.strokeStyle = CASTLE_COLORS.joint;
  ctx.stroke();
  ctx.restore();
}

// Ein quadratischer Pfeiler: steht überall, wo eine Mauer abknickt oder sich verzweigt.
function drawPillar(ctx, x, y, size) {
  const half = size / 2;
  const inner = size * 0.24;
  ctx.fillStyle = CASTLE_COLORS.wallOutline;
  ctx.fillRect(x - half - 1, y - half - 1, size + 2, size + 2);
  ctx.fillStyle = CASTLE_COLORS.merlon;
  ctx.fillRect(x - half, y - half, size, size);
  ctx.fillStyle = CASTLE_COLORS.walkway;
  ctx.fillRect(x - inner, y - inner, inner * 2, inner * 2);
}

// Ein offenes rundes Türmchen mit Zinnenkranz: steht an jedem freien Mauerende.
function drawTurret(ctx, x, y, radius) {
  const ringWidth = radius * 0.42;
  const ringRadius = radius - ringWidth / 2;
  const merlonLength = (2 * Math.PI * ringRadius) / 12; // 6 Zinnen, 6 Lücken

  fillDisc(ctx, x, y, radius + 1, CASTLE_COLORS.wallOutline);
  fillDisc(ctx, x, y, radius, CASTLE_COLORS.crenel);

  ctx.save();
  ctx.strokeStyle = CASTLE_COLORS.merlon;
  ctx.lineWidth = ringWidth;
  ctx.setLineDash([merlonLength, merlonLength]);
  ctx.beginPath();
  ctx.arc(x, y, ringRadius, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.restore();

  fillDisc(ctx, x, y, radius - ringWidth, CASTLE_COLORS.walkway);
}

// Ein großer runder Turm mit Kegeldach: Zinnenkranz außen, darauf das Dach mit
// einer hellen und einer schattigen Hälfte und Graten vom Rand zur Spitze.
function drawRoofedTower(ctx, x, y, radius) {
  const roofRadius = radius * 0.74;
  drawTurret(ctx, x, y, radius);

  fillDisc(ctx, x, y, roofRadius + 1, CASTLE_COLORS.roofRidge);
  fillDisc(ctx, x, y, roofRadius, CASTLE_COLORS.roof);

  // Schattenhälfte: der Halbkreis, der vom Licht (links oben) abgewandt ist
  ctx.fillStyle = CASTLE_COLORS.roofShade;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, roofRadius, -Math.PI / 4, (3 * Math.PI) / 4);
  ctx.fill();

  ctx.strokeStyle = CASTLE_COLORS.roofRidge;
  ctx.lineWidth = Math.max(0.75, radius * 0.06);
  ctx.beginPath();
  for (let ridge = 0; ridge < 8; ridge++) {
    const angle = (ridge * Math.PI) / 4 + Math.PI / 8;
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * roofRadius, y + Math.sin(angle) * roofRadius);
  }
  ctx.stroke();
  fillDisc(ctx, x, y, radius * 0.1, CASTLE_COLORS.merlon);
}

// Wo welche Türme stehen. Liefert Listen mit { x, y, radius } in Canvas-Koordinaten:
//   roofed:  große Türme mit Dach an den vier Ecken und beidseits der Tore
//   turrets: kleine Türmchen an freien Mauerenden
//   pillars: Pfeiler an Knicken und Verzweigungen
function planTowers(castle, junctions) {
  const { cellSize, wallThickness } = castle;
  const at = (spot, radius) => ({ ...gridPoint(castle, spot.x, spot.y), radius });

  const cornerTowers = outerCorners(castle.maze).map((corner) => at(corner, cellSize * CORNER_TOWER_RADIUS));
  const gateTowers = [castle.entrance, castle.exit]
    .flatMap((gate) => gateTowerSpots(castle, gate))
    .map((spot) => at(spot, cellSize * GATE_TOWER_RADIUS));

  const innerJunctions = junctions.filter((junction) => !isStraightRun(junction));
  const turrets = innerJunctions.filter(isLooseEnd).map((junction) => at(junction, wallThickness * 0.7));
  const pillars = innerJunctions
    .filter((junction) => !isLooseEnd(junction))
    .map((junction) => at(junction, wallThickness * 0.6));

  return { roofed: [...cornerTowers, ...gateTowers], turrets, pillars };
}

// Malt die ganze Burg: Wiese, Wege zu den Toren, Hof, Schatten, Mauern, Pfeiler, Türme.
function drawCastle(ctx, castle) {
  const random = createRandom(castle.seed);
  const segments = collectWallSegments(castle);
  const towers = planTowers(castle, collectJunctions(segments));

  drawGrass(ctx, castle, random);
  drawPathToGate(ctx, castle, castle.entrance);
  drawPathToGate(ctx, castle, castle.exit);
  drawCourtyard(ctx, castle, random);
  drawShadows(ctx, castle, segments, [...towers.roofed, ...towers.turrets]);
  drawWallBodies(ctx, castle, segments);
  towers.pillars.forEach((pillar) => drawPillar(ctx, pillar.x, pillar.y, pillar.radius * 2));
  towers.turrets.forEach((turret) => drawTurret(ctx, turret.x, turret.y, turret.radius));
  towers.roofed.forEach((tower) => drawRoofedTower(ctx, tower.x, tower.y, tower.radius));
}
