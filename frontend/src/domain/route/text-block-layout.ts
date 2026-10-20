import { CHAR_ADVANCE, GLYPH_HEIGHT } from "../font/glyph";
import { widthInCharacters } from "../font/text-width";

/** Die Grundlinie unter den Glyphen einer Zeile ist eine Rasterzeile hoch. */
const BASELINE_HEIGHT = 1;

/** Ein Rechteck aus Zellen, angegeben durch seine äußersten Zellen (beide Ränder eingeschlossen). */
export interface Rectangle {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

/** Die äußersten Zellen des Textblocks auf einer Labyrinth-Seite. */
export type TextBlock = Rectangle;

/**
 * Wie viele Rasterzeilen eine Textzeile belegt: Glyphen, Grundlinie und darunter das
 * Zeilenwechsel-Band, in dem der Lichtpunkt zum Anfang der nächsten Zeile zurückläuft.
 * `returnBandRows` ist die Höhe dieses Bands.
 */
export function lineAdvanceOf(returnBandRows: number): number {
  return GLYPH_HEIGHT + BASELINE_HEIGHT + returnBandRows;
}

/**
 * Breite einer Zeile in Zellen: jede Zeichenbreite mit Lücke, nur hinter der letzten entfällt
 * sie. Die Ersatzglyphe belegt zwei Zeichenbreiten.
 */
export function lineWidthOf(line: string): number {
  return widthInCharacters(line) * CHAR_ADVANCE - 1;
}

/** Die erste Spalte der Zeile, wenn sie im Raster mittig steht. */
export function lineLeftOf(line: string, columns: number): number {
  return Math.floor((columns - lineWidthOf(line)) / 2);
}

/** Berechnet, wo der Textblock im Raster liegt (zentriert). Die Zeilen dürfen nicht fehlen. */
export function layoutTextBlock(
  lines: readonly string[],
  columns: number,
  rows: number,
  returnBandRows: number,
): TextBlock {
  const width = Math.max(...lines.map((line) => lineWidthOf(line)));
  // unter der letzten Zeile entfällt das Band für den Zeilenwechsel
  const height = lines.length * lineAdvanceOf(returnBandRows) - returnBandRows;
  const left = Math.floor((columns - width) / 2);
  const top = Math.floor((rows - height) / 2);
  return { left, right: left + width - 1, top, bottom: top + height - 1 };
}
