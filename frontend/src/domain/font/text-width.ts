import { REPLACEMENT_CHARACTER } from "./font";
import { CHAR_ADVANCE } from "./glyph";

/** Die Ersatzglyphe ist so breit wie zwei Zeichen samt der Lücke dazwischen. */
const REPLACEMENT_WIDTH_IN_CHARACTERS = 2;

/** Wie viele Zeichenbreiten ein Zeichen belegt: die Ersatzglyphe zwei, jedes andere eine. */
function widthOfCharacter(character: string): number {
  return character === REPLACEMENT_CHARACTER ? REPLACEMENT_WIDTH_IN_CHARACTERS : 1;
}

/**
 * Wie breit ein Text ist, gemessen in Zeichenbreiten (nicht in Zeichen): Die Ersatzglyphe zählt
 * doppelt. Zeilenumbruch und Textblock rechnen mit diesem Maß.
 */
export function widthInCharacters(text: string): number {
  return Array.from(text).reduce((sum, character) => sum + widthOfCharacter(character), 0);
}

/** Breite des Felds einer Glyphe in Zellen; zwischen den Zeichenbreiten liegen Lücken. */
export function glyphWidthOf(character: string): number {
  return widthOfCharacter(character) * CHAR_ADVANCE - 1;
}
