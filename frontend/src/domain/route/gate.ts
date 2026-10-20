import type { Position } from "../maze/position";

export type Side = "left" | "right" | "top" | "bottom";

/** Eingang oder Ausgang einer Labyrinth-Seite: die Randzelle und der Rand, an dem sie liegt. */
export interface Gate {
  readonly cell: Position;
  readonly side: Side;
}

const OUTWARD: Readonly<Record<Side, Position>> = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  top: { x: 0, y: -1 },
  bottom: { x: 0, y: 1 },
};

const OPPOSITE_SIDE: Readonly<Record<Side, Side>> = {
  left: "right",
  right: "left",
  top: "bottom",
  bottom: "top",
};

/** Die Richtung, die an diesem Rand aus dem Raster hinausführt (je Achse -1, 0 oder 1). */
export function outwardOf(side: Side): Position {
  return OUTWARD[side];
}

/** Die Zelle, die `distance` Schritte außerhalb des Rasters vor der Randzelle des Tors liegt. */
export function cellOutside(gate: Gate, distance: number): Position {
  const outward = outwardOf(gate.side);
  return { x: gate.cell.x + outward.x * distance, y: gate.cell.y + outward.y * distance };
}

/**
 * Der Eingang einer Folgeseite: am gegenüberliegenden Rand genau dort, wo der Lichtpunkt die
 * vorige Seite verlassen hat (gleiche Zeile bzw. gleiche Spalte). So wirkt der Seitenwechsel
 * wie ein durchgehender Weg.
 */
export function entranceOppositeOf(exit: Gate, columns: number, rows: number): Gate {
  const side = OPPOSITE_SIDE[exit.side];
  const { x, y } = exit.cell;
  switch (side) {
    case "left":
      return { cell: { x: 0, y }, side };
    case "right":
      return { cell: { x: columns - 1, y }, side };
    case "top":
      return { cell: { x, y: 0 }, side };
    case "bottom":
      return { cell: { x, y: rows - 1 }, side };
  }
}
