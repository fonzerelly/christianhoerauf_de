import type { CellId } from "../../src/domain/maze/cell-graph";
import type { MazePage } from "../../src/domain/pages/maze-page-generator";
import type { Gate } from "../../src/domain/route/gate";
import { glyphFieldsOf } from "./route-reader";

const OPPOSITE_SIDE = { left: "right", right: "left", top: "bottom", bottom: "top" } as const;

/** Die Stellen, an denen die Route gegen eine Regel verstößt, als lesbare Sätze. */
export function checkRoute(page: MazePage, returnBandRows: number): string[] {
  return [
    ...checkSteps(page),
    ...checkOutsideSteps(page),
    ...checkCrossings(page, returnBandRows),
    ...checkReachability(page),
  ];
}

/** Gilt für eine Folge von Seiten einer Antwort: jeder Eingang liegt dem vorigen Ausgang gegenüber. */
export function checkPageSequence(pages: readonly MazePage[]): string[] {
  const problems: string[] = [];
  pages.slice(1).forEach((page, index) => {
    const exit = pages[index]?.exit;
    if (exit && !isOpposite(page.entrance, exit, page.grid.columns, page.grid.rows)) {
      problems.push(
        `Eingang von Seite ${String(index + 2)} liegt nicht gegenüber dem vorigen Ausgang`,
      );
    }
  });
  return problems;
}

function isOpposite(entrance: Gate, exit: Gate, columns: number, rows: number): boolean {
  if (entrance.side !== OPPOSITE_SIDE[exit.side]) return false;
  const sameRow = entrance.cell.y === exit.cell.y;
  const sameColumn = entrance.cell.x === exit.cell.x;
  const onBorder =
    (entrance.side === "left" && entrance.cell.x === 0) ||
    (entrance.side === "right" && entrance.cell.x === columns - 1) ||
    (entrance.side === "top" && entrance.cell.y === 0) ||
    (entrance.side === "bottom" && entrance.cell.y === rows - 1);
  const alongBorder = entrance.side === "left" || entrance.side === "right" ? sameRow : sameColumn;
  return onBorder && alongBorder;
}

/** Lückenlos und nie durch eine Wand. */
function checkSteps(page: MazePage): string[] {
  const { grid, route } = page;
  const problems: string[] = [];
  route.slice(1).forEach((step, index) => {
    const before = route[index];
    if (!before) return;
    const distance = Math.abs(step.x - before.x) + Math.abs(step.y - before.y);
    if (distance !== 1) {
      problems.push(
        `Lücke in der Route zwischen Wegstück ${String(index)} und ${String(index + 1)}`,
      );
    } else if (
      grid.contains(before.x, before.y) &&
      grid.contains(step.x, step.y) &&
      !grid.isConnected(grid.idOf(before.x, before.y), grid.idOf(step.x, step.y))
    ) {
      problems.push(`Die Route läuft bei Wegstück ${String(index + 1)} durch eine Wand`);
    }
  });
  return problems;
}

/** Nur die ersten und letzten zwei Wegstücke liegen außerhalb, die übrigen im Raster; Anfang und Ende stimmen. */
function checkOutsideSteps(page: MazePage): string[] {
  const { grid, route, entrance, exit } = page;
  const problems: string[] = [];
  route.forEach((step, index) => {
    const isOuter = index < 2 || index >= route.length - 2;
    if (grid.contains(step.x, step.y) === isOuter) {
      problems.push(
        `Wegstück ${String(index)} liegt ${isOuter ? "im Raster" : "außerhalb des Rasters"}`,
      );
    }
  });
  const firstInside = route[2];
  const lastInside = route[route.length - 3];
  if (firstInside?.x !== entrance.cell.x || firstInside.y !== entrance.cell.y) {
    problems.push("Die Route beginnt nicht am Eingang");
  }
  if (lastInside?.x !== exit.cell.x || lastInside.y !== exit.cell.y) {
    problems.push("Die Route endet nicht am Ausgang");
  }
  return problems;
}

/**
 * Eine Zelle, die die Route in alle vier Richtungen verlässt, ist eine Kreuzung. Im Textblock
 * ist das erlaubt, nämlich in den Feldern der Glyphen samt der Grundlinie darunter: Der Weg etwa
 * von B, D und I kreuzt sich unten selbst, weil der senkrechte Balken in der Mitte die untere
 * Linie schneidet, und das Fragezeichen am Zeilenende kehrt auf der Grundlinie zu einer Zelle
 * zurück, die die Route schon gelaufen ist. Außerhalb davon (Anlauf, Zeilenwechsel, Ablauf)
 * darf sich die Route nicht kreuzen.
 */
function checkCrossings(page: MazePage, returnBandRows: number): string[] {
  const { route } = page;
  const fields = glyphFieldsOf(page, returnBandRows).flat();
  const isInField = (cell: { x: number; y: number }): boolean =>
    fields.some(
      ({ left, top }) => cell.x >= left && cell.x < left + 3 && cell.y >= top && cell.y <= top + 5, // 5 Zeilen Glyphe plus die Grundlinie
    );
  const neighbours = new Map<string, Set<string>>();
  const key = (step: { x: number; y: number }): string => `${String(step.x)},${String(step.y)}`;
  route.slice(1).forEach((step, index) => {
    const before = route[index];
    if (!before) return;
    neighbours.set(key(step), (neighbours.get(key(step)) ?? new Set()).add(key(before)));
    neighbours.set(key(before), (neighbours.get(key(before)) ?? new Set()).add(key(step)));
  });
  return [...neighbours.entries()]
    .filter(([cell, around]) => {
      const [x = 0, y = 0] = cell.split(",").map(Number);
      return around.size >= 4 && !isInField({ x, y });
    })
    .map(([cell]) => `Die Route kreuzt sich in Zelle ${cell}`);
}

/** Jede Zelle ist vom Eingang aus durch die Gänge erreichbar. */
function checkReachability(page: MazePage): string[] {
  const { grid, entrance } = page;
  const start = grid.idOf(entrance.cell.x, entrance.cell.y);
  const seen = new Set<CellId>([start]);
  const queue = [start];
  for (const cell of queue) {
    for (const neighbour of grid.neighboursOf(cell)) {
      if (!seen.has(neighbour) && grid.isConnected(cell, neighbour)) {
        seen.add(neighbour);
        queue.push(neighbour);
      }
    }
  }
  const total = grid.columns * grid.rows;
  return seen.size === total
    ? []
    : [`Nur ${String(seen.size)} von ${String(total)} Zellen sind vom Eingang aus erreichbar`];
}
