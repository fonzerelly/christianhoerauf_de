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

/** Wo ein Stichwort waagrecht steht (ADR 0007): links, mittig oder rechts. */
export type TextAlignment = "left" | "center" | "right";

/** Links oder rechts steht der Block so weit vom Rand: 8 % der Breite, mindestens 4 Spalten. */
const EDGE_SHARE = 0.08;
const SMALLEST_EDGE = 4;
/** So viele Spalten bleiben neben dem Text immer frei (Zeilenwechsel, Tor, Luft zum Rand). */
const FREE_COLUMNS = 3;

/** Die erste Spalte einer Zeile im Block: bündig links, bündig rechts oder mittig. */
export function lineLeftIn(block: TextBlock, line: string, alignment: TextAlignment): number {
  const free = block.right - block.left + 1 - lineWidthOf(line);
  if (alignment === "left") return block.left;
  if (alignment === "right") return block.left + free;
  return block.left + Math.floor(free / 2);
}

/** Die erste Spalte des Blocks; links und rechts mit Abstand zum Rand, aber nie näher als 3 Spalten. */
function blockLeftOf(width: number, columns: number, alignment: TextAlignment): number {
  if (alignment === "center") return Math.floor((columns - width) / 2);
  const edge = Math.max(SMALLEST_EDGE, Math.round(columns * EDGE_SHARE));
  const wish = alignment === "left" ? edge : columns - edge - width;
  return Math.min(Math.max(wish, FREE_COLUMNS), columns - FREE_COLUMNS - width);
}

/**
 * Berechnet, wo der Textblock im Raster liegt: senkrecht mittig, waagrecht nach `alignment`
 * (mittig, oder links bzw. rechts mit Abstand zum Rand). Die Zeilen dürfen nicht fehlen.
 */
export function layoutTextBlock(
  lines: readonly string[],
  columns: number,
  rows: number,
  returnBandRows: number,
  alignment: TextAlignment = "center",
): TextBlock {
  const width = Math.max(...lines.map((line) => lineWidthOf(line)));
  // unter der letzten Zeile entfällt das Band für den Zeilenwechsel
  const height = lines.length * lineAdvanceOf(returnBandRows) - returnBandRows;
  const left = blockLeftOf(width, columns, alignment);
  const top = Math.floor((rows - height) / 2);
  return { left, right: left + width - 1, top, bottom: top + height - 1 };
}
