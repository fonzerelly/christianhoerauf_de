import { outwardOf } from "../domain/route/gate";
import type { Side } from "../domain/route/gate";

export interface Shift {
  readonly x: number;
  readonly y: number;
}

/** Rundet auf ganze Pixel. Das `+ 0` macht aus -0 eine 0. */
function wholePixels(value: number): number {
  return Math.round(value) + 0;
}

/**
 * Um wie viele Pixel die beiden Seiten beim Weiterschieben verschoben sind.
 *
 * Das Bild schiebt in die Richtung weiter, in die der Lichtpunkt verschwunden ist (`exitSide`):
 * die alte Seite (`outgoing`) wandert entgegengesetzt hinaus, die neue (`incoming`) rückt von dort
 * herein. Beide liegen genau eine Rasterbreite bzw. -höhe auseinander, so treffen Ausgang und
 * Eingang nahtlos aufeinander. `part` ist der Fortschritt von 0 bis 1.
 */
export function scrollShiftsOf(
  exitSide: Side,
  columns: number,
  rows: number,
  cellSize: number,
  part: number,
): { outgoing: Shift; incoming: Shift } {
  const direction = outwardOf(exitSide);
  const distanceX = direction.x * columns * cellSize;
  const distanceY = direction.y * rows * cellSize;

  const outgoing = { x: wholePixels(-distanceX * part), y: wholePixels(-distanceY * part) };
  const incoming = { x: outgoing.x + distanceX, y: outgoing.y + distanceY };
  return { outgoing, incoming };
}
