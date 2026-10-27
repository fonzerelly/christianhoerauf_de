import type { Glyph, Waypoint } from "../font/glyph";
import { lastOf } from "../lists";
import type { Position } from "../maze/position";
import { isSameCell } from "./cells";
import { faceWithHandOverMouth } from "./face-with-hand-over-mouth";
import { heartHeightOf, heartPath } from "./heart";

/** Die Bilder, die der Lichtpunkt statt eines Textes zeichnen kann (die Gimmicks aus ADR 0003). */
export type PictureName = "heart" | "face_with_hand_over_mouth";

/**
 * Ein Bild, fertig zum Zeichnen: der Weg des Lichtpunkts im selben Format wie eine Glyphe, in
 * einem Feld von `width` × `height` Zellen. Wie bei einer Glyphe beginnt und endet der Weg in der
 * untersten Zeile; der Lichtpunkt kommt von unten herauf und geht nach unten wieder hinaus.
 */
export interface Picture {
  readonly width: number;
  readonly height: number;
  readonly glyph: Glyph;
}

/** Kleiner als so viele Zellen in der Breite ist ein Bild nicht mehr zu erkennen. */
export const SMALLEST_SIZE: Readonly<Record<PictureName, number>> = {
  heart: 11,
  face_with_hand_over_mouth: 17,
};

/** Waagrecht, dann senkrecht ohne Leuchtspur von `from` zu `to`; eine Ecke auf der Linie entfällt. */
function hop(from: Position, to: Position): Waypoint[] {
  const corner = { x: to.x, y: from.y };
  const waypoints: Waypoint[] = [];
  if (!isSameCell(corner, from) && !isSameCell(corner, to)) {
    waypoints.push({ ...corner, marker: "hop" });
  }
  waypoints.push({ ...to, marker: "hop" });
  return waypoints;
}

/**
 * Macht aus Strichen (Wegen durch Nachbarzellen) einen Weg im Format einer Glyphe: Jede Zelle
 * wird ein Wegpunkt. Beginnt ein Strich nicht dort, wo der vorige endet, springt der Lichtpunkt
 * ohne Leuchtspur hin (`hop`, erst waagrecht, dann senkrecht). Zuletzt springt er zurück an den
 * Anfang des ersten Strichs, damit er dort hinausgehen kann, wo er hereingekommen ist.
 */
export function glyphOfStrokes(strokes: readonly (readonly Position[])[]): Waypoint[] {
  const waypoints: Waypoint[] = [];
  for (const stroke of strokes) {
    const [first, ...rest] = stroke;
    if (first === undefined) continue;
    const end = waypoints.at(-1);
    if (end === undefined) waypoints.push(first);
    else if (!isSameCell(end, first)) waypoints.push(...hop(end, first));
    waypoints.push(...rest);
  }
  const start = waypoints[0];
  if (start !== undefined && !isSameCell(lastOf(waypoints), start)) {
    waypoints.push(...hop(lastOf(waypoints), start));
  }
  return waypoints.map(({ x, y, marker }) => (marker === undefined ? { x, y } : { x, y, marker }));
}

/**
 * Das Bild in der Breite `size` (ungerade, siehe `heartPath` und `faceWithHandOverMouth`). Das
 * Herz ist etwas niedriger als breit, der Smiley quadratisch.
 */
export function drawPicture(name: PictureName, size: number): Picture {
  switch (name) {
    case "heart":
      return { width: size, height: heartHeightOf(size), glyph: glyphOfStrokes([heartPath(size)]) };
    case "face_with_hand_over_mouth":
      return { width: size, height: size, glyph: glyphOfStrokes(faceWithHandOverMouth(size)) };
  }
}
