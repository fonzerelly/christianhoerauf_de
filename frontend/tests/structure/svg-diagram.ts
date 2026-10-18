// Zeichnet eine Labyrinth-Seite als SVG: dünne Wände, darüber die Route in Rot. Gedacht für
// Schaubilder in den Tests (Datei-Snapshots) und die Übersichtsseite.

import type { MazePage } from "../../src/domain/pages/maze-page-generator";
import type { StepKind } from "../../src/domain/route/route-step";

/** Wie viele Zellen um das Raster herum Platz bleibt, damit die Außenschritte der Route sichtbar sind. */
const MARGIN_CELLS = 2;

const STYLE = `
    .walls { fill: none; stroke: #6b7a6f; stroke-width: 1; stroke-linecap: square; }
    .connector { fill: none; stroke: #f2a3a3; stroke-width: 1; }
    .silent { fill: none; stroke: #b5b5b5; stroke-width: 1; stroke-dasharray: 2 2; }
    .letter { fill: none; stroke: #d62020; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    .dot { fill: #d62020; }`;

export function renderSvg(page: MazePage, cellSize: number): string {
  const { columns, rows } = page.grid;
  const margin = MARGIN_CELLS * cellSize;
  const width = columns * cellSize + 2 * margin;
  const height = rows * cellSize + 2 * margin;

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${String(-margin)} ${String(-margin)} ${String(width)} ${String(height)}" width="${String(width)}" height="${String(height)}">`,
    `  <style>${STYLE}\n  </style>`,
    `  <path class="walls" d="${wallsPath(page, cellSize)}"/>`,
    ...routePaths(page, cellSize),
    ...dots(page, cellSize),
    "</svg>",
    "",
  ].join("\n");
}

/** Alle Wände als ein Pfad; benachbarte Wandstücke sind zu einem Strich zusammengefasst. */
function wallsPath(page: MazePage, cellSize: number): string {
  const { grid, entrance, exit } = page;
  const { columns, rows } = grid;
  const isGateCell = (x: number, y: number, side: string): boolean =>
    [entrance, exit].some((gate) => gate.side === side && gate.cell.x === x && gate.cell.y === y);

  // Waagrechte Wand unter Zelle (x, y-1) bzw. über (x, y), für y = 0 bis rows; senkrecht entsprechend.
  const horizontal = (x: number, y: number): boolean => {
    if (y === 0) return !isGateCell(x, 0, "top");
    if (y === rows) return !isGateCell(x, rows - 1, "bottom");
    return !grid.isOpenDown(x, y - 1);
  };
  const vertical = (x: number, y: number): boolean => {
    if (x === 0) return !isGateCell(0, y, "left");
    if (x === columns) return !isGateCell(columns - 1, y, "right");
    return !grid.isOpenRight(x - 1, y);
  };

  const strokes: string[] = [];
  for (let y = 0; y <= rows; y++) {
    for (const [from, length] of runsOf(columns, (x) => horizontal(x, y))) {
      strokes.push(
        `M${String(from * cellSize)} ${String(y * cellSize)}h${String(length * cellSize)}`,
      );
    }
  }
  for (let x = 0; x <= columns; x++) {
    for (const [from, length] of runsOf(rows, (y) => vertical(x, y))) {
      strokes.push(
        `M${String(x * cellSize)} ${String(from * cellSize)}v${String(length * cellSize)}`,
      );
    }
  }
  return strokes.join("");
}

/** Die zusammenhängenden Abschnitte, in denen `isWall` wahr ist, als [Start, Länge]. */
function runsOf(count: number, isWall: (index: number) => boolean): [number, number][] {
  const runs: [number, number][] = [];
  let start: number | undefined;
  for (let index = 0; index <= count; index++) {
    const wall = index < count && isWall(index);
    if (wall && start === undefined) start = index;
    if (!wall && start !== undefined) {
      runs.push([start, index - start]);
      start = undefined;
    }
  }
  return runs;
}

/** Die Route als je ein Pfad pro Art; Abschnitte gleicher Art laufen in einem Zug durch. */
function routePaths(page: MazePage, cellSize: number): string[] {
  const center = (cell: number): number => cell * cellSize + cellSize / 2;
  const paths: Record<StepKind, string> = { connector: "", silent: "", letter: "" };
  let previousKind: StepKind | undefined;

  page.route.forEach((step, index) => {
    const before = page.route[index - 1];
    if (!before) return;
    const move = `${String(center(step.x))} ${String(center(step.y))}`;
    paths[step.kind] +=
      previousKind === step.kind
        ? `L${move}`
        : `M${String(center(before.x))} ${String(center(before.y))}L${move}`;
    previousKind = step.kind;
  });

  return (["connector", "silent", "letter"] as const).map(
    (kind) => `  <path class="${kind}" d="${paths[kind]}"/>`,
  );
}

function dots(page: MazePage, cellSize: number): string[] {
  const center = (cell: number): number => cell * cellSize + cellSize / 2;
  return page.route
    .filter((step) => step.isDot)
    .map(
      (step) =>
        `  <circle class="dot" cx="${String(center(step.x))}" cy="${String(center(step.y))}" r="${String(cellSize / 4)}"/>`,
    );
}
