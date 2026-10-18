/** Breite des Felds einer Glyphe in Zellen (x läuft von 0 bis 2). */
export const GLYPH_WIDTH = 3;

/** Höhe des Felds einer Glyphe in Zellen (y läuft von 0 oben bis 4 unten). */
export const GLYPH_HEIGHT = 5;

/** Abstand von einer Glyphe zur nächsten: Breite plus eine Zelle Lücke. */
export const CHAR_ADVANCE = GLYPH_WIDTH + 1;

/**
 * Besonderheit eines Wegpunkts:
 * - `dot`: Der Lichtpunkt springt ohne Leuchtspur hierher und hinterlässt einen Punkt.
 * - `hop`: Der Lichtpunkt springt ohne Leuchtspur hierher.
 */
export type WaypointMarker = "dot" | "hop";

/** Ein Eckpunkt im Weg einer Glyphe. Zwischen zwei Wegpunkten läuft der Lichtpunkt geradeaus. */
export interface Waypoint {
  readonly x: number;
  readonly y: number;
  readonly marker?: WaypointMarker;
}

/** Der Weg des Lichtpunkts für ein Zeichen, als Liste von Wegpunkten. */
export type Glyph = readonly Waypoint[];
