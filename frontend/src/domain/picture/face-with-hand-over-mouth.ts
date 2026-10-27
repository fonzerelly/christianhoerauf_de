import type { Position } from "../maze/position";
import { cellsOnCurve, cellsOnLine, closeByMirroring } from "./cells";

/** So viele Punkte je Bogen; dicht genug, dass zwischen zwei Punkten höchstens eine Zelle liegt. */
const SAMPLES = 400;

// Die Augen, gemessen in Radien des Gesichts vom Mittelpunkt aus.
const EYE_SIDEWAYS = 0.38;
const EYE_RAISED = 0.35;
const EYE_HALF_WIDTH = 0.2;
const EYE_HEIGHT = 0.18;

// Die Hand, gemessen an der Größe des Felds.
/** Abstand zweier Fingerwände in Zellen: Jeder Finger ist eine Zelle breit, die Wände teilen sie sich. */
const FINGER_WIDTH = 2;
const FINGER_COUNT = 4;
/** Länge der Finger vom kleinen Finger (links) bis zum Zeigefinger, als Anteil des Platzes bis zu den Augen. */
const FINGER_SHARES = [0.6, 0.9, 1, 0.8];
const WRIST_SHARE = 0.16;
const PALM_SHARE = 0.2;
/** So viele Zeilen bleiben mindestens zwischen den Augen und den Fingerspitzen frei. */
const GAP_BELOW_EYES = 2;

/** Ein Bogen einer Ellipse um `center`, von Winkel `from` bis `to` (0 zeigt nach rechts, π/2 nach unten). */
function arc(
  center: Position,
  radiusX: number,
  radiusY: number,
  from: number,
  to: number,
): Position[] {
  const points: Position[] = [];
  for (let sample = 0; sample <= SAMPLES; sample++) {
    const angle = from + ((to - from) * sample) / SAMPLES;
    points.push({
      x: center.x + radiusX * Math.cos(angle),
      y: center.y + radiusY * Math.sin(angle),
    });
  }
  return cellsOnCurve(points);
}

/** Die Zellen auf einem Weg, der von `start` aus waagrecht und senkrecht von Eckpunkt zu Eckpunkt läuft. */
function cellsThrough(start: Position, corners: readonly Position[]): Position[] {
  const cells = [start];
  let from = start;
  for (const corner of corners) {
    cells.push(...cellsOnLine(from, corner).slice(1));
    from = corner;
  }
  return cells;
}

/**
 * Die Hand: aus dem Kinn das Handgelenk hinauf, links um die Handfläche, vier Finger nebeneinander
 * nach oben, rechts am Fingeransatz ein kurzer Daumen, die Handfläche hinunter und das Handgelenk
 * zurück ins Kinn.
 * Die Finger reichen so weit hinauf, dass zu den Augen `GAP_BELOW_EYES` Zeilen frei bleiben.
 */
function hand(size: number, chin: Position, eyesBottom: number): Position[] {
  const palmBottom = chin.y - Math.max(2, Math.round(size * WRIST_SHARE));
  const fingerBase = palmBottom - Math.max(4, Math.round(size * PALM_SHARE));
  const room = fingerBase - (eyesBottom + GAP_BELOW_EYES);
  const left = chin.x - (FINGER_COUNT / 2) * FINGER_WIDTH;
  const right = left + FINGER_COUNT * FINGER_WIDTH;

  // Die unteren Ecken der Handfläche sind um eine Stufe abgerundet, damit sie dem Kinn nicht zu
  // nahe kommen.
  const corners: Position[] = [
    { x: chin.x, y: palmBottom },
    { x: left + 1, y: palmBottom },
    { x: left + 1, y: palmBottom - 1 },
    { x: left, y: palmBottom - 1 },
    { x: left, y: fingerBase },
  ];
  FINGER_SHARES.forEach((share, finger) => {
    const x = left + finger * FINGER_WIDTH;
    const tip = fingerBase - Math.max(1, Math.round(room * share));
    corners.push(
      { x, y: tip },
      { x: x + FINGER_WIDTH, y: tip },
      { x: x + FINGER_WIDTH, y: fingerBase },
    );
  });
  corners.push(
    { x: right + 1, y: fingerBase }, // der Daumen
    { x: right + 1, y: fingerBase + 2 },
    { x: right, y: fingerBase + 2 },
    { x: right, y: palmBottom - 1 },
    { x: right - 1, y: palmBottom - 1 },
    { x: right - 1, y: palmBottom },
    { x: chin.x, y: palmBottom },
    chin,
  );
  return cellsThrough(chin, corners);
}

/**
 * Ein Smiley, der sich die Hand vor den Mund hält (🤭), in einem Feld von `size` × `size` Zellen
 * (`size` ungerade, damit das Kinn genau in der mittleren Spalte liegt). Vier Striche:
 * 1. das Gesicht, ein Kreis vom Kinn links herum zurück zum Kinn,
 * 2. die Hand, die aus dem Kinn wächst und den Mund verdeckt,
 * 3. und 4. das linke und das rechte Auge, lachend: Bögen, nach oben gewölbt.
 * Gesicht und Augen sind spiegelgleich; nur die Hand hat den Daumen rechts.
 */
export function faceWithHandOverMouth(size: number): Position[][] {
  const middle = (size - 1) / 2;
  const radius = middle;
  // + 0.5: Die Kurven laufen durch die Mitten der Zellen.
  const center = { x: middle + 0.5, y: middle + 0.5 };

  const face = closeByMirroring(
    arc(center, radius, radius, Math.PI / 2, (3 * Math.PI) / 2), // linke Hälfte: Kinn → Scheitel
    size,
  );
  const leftEye = arc(
    { x: center.x - EYE_SIDEWAYS * radius, y: center.y - EYE_RAISED * radius },
    EYE_HALF_WIDTH * radius,
    EYE_HEIGHT * radius,
    Math.PI,
    2 * Math.PI,
  );
  const rightEye = leftEye.map(({ x, y }) => ({ x: size - 1 - x, y })).reverse();
  const eyesBottom = Math.max(...leftEye.map((cell) => cell.y));
  const chin = { x: middle, y: size - 1 };

  return [face, hand(size, chin, eyesBottom), leftEye, rightEye];
}
