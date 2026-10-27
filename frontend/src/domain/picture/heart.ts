import type { Position } from "../maze/position";
import { cellsOnCurve, closeByMirroring } from "./cells";

// Die Herzkurve: x = 16 sin³ t, y = 13 cos t - 5 cos 2t - 2 cos 3t - cos 4t (y zeigt nach oben).
// Bei t = π liegt die Spitze unten, bei t = 0 bzw. 2π die Kerbe oben in der Mitte.
const CURVE_HALF_WIDTH = 16;
const CURVE_TOP = 11.923; // höchster Punkt der beiden Bögen
const CURVE_BOTTOM = -17; // die Spitze
/** So viele Punkte je Hälfte; dicht genug, dass zwischen zwei Punkten höchstens eine Zelle liegt. */
const SAMPLES_PER_HALF = 400;

function heartCurve(t: number): Position {
  return {
    x: CURVE_HALF_WIDTH * Math.sin(t) ** 3,
    y: 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t),
  };
}

/** Die Höhe des Herzens in Zellen bei dieser Breite: so hoch, wie die Kurve es vorgibt. */
export function heartHeightOf(width: number): number {
  return Math.round((width * (CURVE_TOP - CURVE_BOTTOM)) / (2 * CURVE_HALF_WIDTH));
}

/**
 * Der Umriss eines Herzens als Weg durch die Zellen eines Felds von `width` Spalten (ungerade,
 * damit Spitze und Kerbe genau in der mittleren Spalte liegen) und `heartHeightOf(width)` Zeilen.
 * Der Weg beginnt an der Spitze, läuft links hinauf über den linken Bogen zur Kerbe, über den
 * rechten Bogen zurück und endet wieder an der Spitze.
 *
 * Gerastert wird nur die linke Hälfte; die rechte ist ihr Spiegelbild (`closeByMirroring`).
 */
export function heartPath(width: number): Position[] {
  const height = heartHeightOf(width);
  // Kurve auf die Zellmitten abbilden: -16 → Mitte der ersten Spalte, +16 → Mitte der letzten.
  const toField = ({ x, y }: Position): Position => ({
    x: ((x + CURVE_HALF_WIDTH) / (2 * CURVE_HALF_WIDTH)) * (width - 1) + 0.5,
    y: ((CURVE_TOP - y) / (CURVE_TOP - CURVE_BOTTOM)) * (height - 1) + 0.5,
  });

  const points: Position[] = [];
  for (let sample = 0; sample <= SAMPLES_PER_HALF; sample++) {
    points.push(toField(heartCurve(Math.PI + (Math.PI * sample) / SAMPLES_PER_HALF)));
  }
  return closeByMirroring(cellsOnCurve(points), width); // linke Hälfte: von der Spitze zur Kerbe
}
