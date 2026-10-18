import type { Position } from "../maze/position";

/**
 * Art eines Wegstücks. Sie bestimmt, wie die Leuchtspur gezeichnet wird.
 * - `letter` (Schriftweg): innerhalb einer Glyphe, kräftige Leuchtspur
 * - `connector` (Verbindungsweg): zwischen Glyphen, Zeilen oder zum Rand, blasse Leuchtspur
 * - `silent` (Sprung): gar keine Leuchtspur
 */
export type StepKind = "letter" | "connector" | "silent";

/**
 * Ein Wegstück der Route: die Zelle, auf der der Lichtpunkt ankommt, und wie er dorthin läuft.
 * Zellen vor dem Eingang und hinter dem Ausgang liegen außerhalb des Rasters.
 */
export interface RouteStep extends Position {
  readonly kind: StepKind;
  /** Hinterlässt der Lichtpunkt hier einen Punkt (Umlaut, Satzpunkt, Fragezeichen)? */
  readonly isDot: boolean;
}
