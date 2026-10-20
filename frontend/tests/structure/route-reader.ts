// Der Leser: liest aus der Route einer Labyrinth-Seite den Text zurück, so wie ein Mensch ihn
// aus der Leuchtspur liest. Er kennt nur die Route, die Schrift und die Maße der Textzeilen,
// nicht den Weg, auf dem die Route entstanden ist.
//
// Gelesen wird, was der Lichtpunkt sichtbar schreibt: die Kanten, die er mit Schriftwegen läuft,
// und die Punkte, die er hinterlässt. Verbindungswege und Sprünge hinterlassen keine Schrift.
// Zeichen, deren Wege dasselbe Bild ergeben (0 und O, 5 und S, 2 und Z), kann auch ein Mensch nicht
// unterscheiden; der Leser nennt dann alle.

import { createDefaultFont } from "../../src/domain/font/font";
import type { Glyph } from "../../src/domain/font/glyph";
import type { MazePage } from "../../src/domain/pages/maze-page-generator";
import type { RouteStep } from "../../src/domain/route/route-step";

const DRAWABLE_CHARACTERS = Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ0123456789-.?!█");

// Maße der Schrift und der Zeilen, hier noch einmal unabhängig vom Neubau hingeschrieben.
const GLYPH_WIDTH = 3;
const GLYPH_HEIGHT = 5;
const CHARACTER_ADVANCE = 4;
// Die Ersatzglyphe ist so breit wie zwei Zeichen samt Lücke: 2 * 4 - 1 Zellen.
const REPLACEMENT_CHARACTER = "█";
const REPLACEMENT_WIDTH = 2 * CHARACTER_ADVANCE - 1;
const BASELINE_HEIGHT = 1;

export interface Box {
  readonly left: number;
  readonly top: number;
  readonly width: number;
}

/**
 * Liest jede Textzeile der Seite. Je Zeichen kommt ein Eintrag: die Zeichen, deren Schrift die
 * Route dort geschrieben hat (zusammen, bei gleichem Bild), ein Leerzeichen für ein leeres Feld
 * oder ein leerer Text, wenn die Schrift zu keinem Zeichen passt. Wirft, wenn die Route
 * irgendwo außerhalb der Glyphen-Felder schreibt.
 */
export function readGlyphs(page: MazePage, returnBandRows: number): string[][] {
  const font = createDefaultFont();
  const signatures = DRAWABLE_CHARACTERS.map((character) => ({
    character,
    ink: inkOfGlyph(font.glyphFor(character) ?? []),
  }));

  let readInk = 0;
  const lines = glyphFieldsOf(page, returnBandRows).map((line) =>
    line.map((field) => {
      const ink = inkInBox(page.route, field);
      readInk += ink.size;
      if (ink.size === 0) return " ";
      return signatures
        .filter((signature) => sameInk(signature.ink, ink))
        .map(({ character }) => character)
        .sort()
        .join("");
    }),
  );

  const allInk = inkInBox(page.route, { left: -1000, top: -1000, width: 5000 }, 5000);
  if (allInk.size !== readInk) {
    throw new Error(
      `${String(allInk.size - readInk)} Stück Schrift liegen außerhalb der Glyphen-Felder`,
    );
  }
  return lines;
}

/**
 * Die Felder aller Zeichen einer Seite (3 x 5 Zellen, die Ersatzglyphe 7 x 5), Zeile für Zeile.
 * Der Textblock steht mittig im Raster, jede Zeile mittig im Textblock.
 */
export function glyphFieldsOf(page: MazePage, returnBandRows: number): Box[][] {
  const lineAdvance = GLYPH_HEIGHT + BASELINE_HEIGHT + returnBandRows;
  const blockHeight = page.lines.length * lineAdvance - returnBandRows;
  const blockTop = Math.floor((page.grid.rows - blockHeight) / 2);

  return page.lines.map((line, lineIndex) => {
    const characters = Array.from(line);
    const widths = characters.map(widthOfField);
    const lineWidth = widths.reduce((sum, width) => sum + width + 1, -1);
    let left = Math.floor((page.grid.columns - lineWidth) / 2);
    return widths.map((width) => {
      const field = { left, top: blockTop + lineIndex * lineAdvance, width };
      left += width + 1;
      return field;
    });
  });
}

function widthOfField(character: string): number {
  return character === REPLACEMENT_CHARACTER ? REPLACEMENT_WIDTH : GLYPH_WIDTH;
}

function sameInk(first: ReadonlySet<string>, second: ReadonlySet<string>): boolean {
  return first.size === second.size && [...first].every((item) => second.has(item));
}

/** Ein Teilstück der Schrift als Text: Kante zwischen zwei Zellen oder Punkt auf einer Zelle. */
function edge(from: { x: number; y: number }, to: { x: number; y: number }): string {
  const ends = [`${String(from.x)},${String(from.y)}`, `${String(to.x)},${String(to.y)}`].sort();
  return `${ends[0] ?? ""}-${ends[1] ?? ""}`;
}

function dot(cell: { x: number; y: number }): string {
  return `*${String(cell.x)},${String(cell.y)}`;
}

/** Die Schrift, die eine Glyphe schreibt, in Zellen des Felds (0,0 oben links). */
function inkOfGlyph(glyph: Glyph): Set<string> {
  const ink = new Set<string>();
  let current = { x: glyph[0]?.x ?? 0, y: glyph[0]?.y ?? 0 };
  glyph.forEach((waypoint, index) => {
    const writes = waypoint.marker === undefined && glyph[index - 1]?.marker !== "dot";
    while (index > 0 && (current.x !== waypoint.x || current.y !== waypoint.y)) {
      const next = {
        x: current.x + Math.sign(waypoint.x - current.x),
        y: current.y + Math.sign(waypoint.y - current.y),
      };
      if (writes) ink.add(edge(current, next));
      current = next;
    }
    if (waypoint.marker === "dot") ink.add(dot(current));
  });
  return ink;
}

/** Die Schrift, die die Route in einem Feld schreibt, in Zellen des Felds. */
function inkInBox(route: readonly RouteStep[], box: Box, height = GLYPH_HEIGHT): Set<string> {
  const isInside = (step: RouteStep): boolean =>
    step.x >= box.left &&
    step.x < box.left + box.width &&
    step.y >= box.top &&
    step.y < box.top + height;
  const relative = (step: RouteStep): { x: number; y: number } => ({
    x: step.x - box.left,
    y: step.y - box.top,
  });

  const ink = new Set<string>();
  route.forEach((step, index) => {
    if (!isInside(step)) return;
    if (step.isDot) ink.add(dot(relative(step)));
    const before = route[index - 1];
    if (step.kind === "letter" && before && isInside(before)) {
      ink.add(edge(relative(before), relative(step)));
    }
  });
  return ink;
}
