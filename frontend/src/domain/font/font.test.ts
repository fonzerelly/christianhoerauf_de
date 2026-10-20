import { describe, expect, it } from "vitest";
import { GLYPH_HEIGHT } from "./glyph";
import type { Glyph } from "./glyph";
import { createDefaultFont, REPLACEMENT_CHARACTER } from "./font";
import { glyphWidthOf } from "./text-width";

const font = createDefaultFont();

const DRAWABLE_CHARACTERS = [
  ...Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ"),
  ...Array.from("0123456789"),
  ...Array.from("-.?!"),
  REPLACEMENT_CHARACTER,
];

function cellKey(x: number, y: number): string {
  return `${String(x)},${String(y)}`;
}

/** Alle Zellen, über die der Lichtpunkt beim Ablaufen der Wegpunkte läuft (Start eingeschlossen). */
function cellsWalkedBy(glyph: Glyph): string[] {
  const [first, ...others] = glyph;
  if (first === undefined) return [];
  const cells = [cellKey(first.x, first.y)];
  let { x, y } = first;
  for (const waypoint of others) {
    while (x !== waypoint.x || y !== waypoint.y) {
      x += Math.sign(waypoint.x - x);
      y += Math.sign(waypoint.y - y);
      cells.push(cellKey(x, y));
    }
  }
  return cells;
}

describe("Font", () => {
  it("kennt Buchstaben, Umlaute, Ziffern, Bindestrich, Punkt, Fragezeichen, Ausrufezeichen und die Ersatzglyphe", () => {
    for (const character of DRAWABLE_CHARACTERS) {
      expect(font.hasGlyph(character), character).toBe(true);
    }
  });

  it("kennt weder Kleinbuchstaben noch Leerzeichen noch das Trennstellen-Zeichen", () => {
    for (const character of ["a", " ", "|", "€", "ß", ","]) {
      expect(font.hasGlyph(character), character).toBe(false);
      expect(font.glyphFor(character), character).toBeUndefined();
    }
  });

  it("liefert für H den Weg des Prototyps", () => {
    expect(font.glyphFor("H")).toEqual([
      { x: 0, y: 4 },
      { x: 0, y: 0 },
      { x: 0, y: 2 },
      { x: 2, y: 2 },
      { x: 2, y: 0 },
      { x: 2, y: 4 },
    ]);
  });

  it("übernimmt die Markierungen: der Punkt ist ein Punkt, der Strich im Bindestrich ein Sprung", () => {
    expect(font.glyphFor(".")).toEqual([{ x: 0, y: 4, marker: "dot" }]);
    expect(font.glyphFor("-")).toEqual([
      { x: 0, y: 4 },
      { x: 0, y: 2, marker: "hop" },
      { x: 2, y: 2 },
      { x: 2, y: 4, marker: "hop" },
    ]);
  });

  it("schreibt das Ausrufezeichen als Strich, dem ein Punkt folgt", () => {
    expect(font.glyphFor("!")).toEqual([
      { x: 1, y: 4 },
      { x: 1, y: 2, marker: "hop" },
      { x: 1, y: 0 },
      { x: 1, y: 4, marker: "dot" },
    ]);
  });

  it("schreibt die Ersatzglyphe als Kamm: Rücken rechts, fünf Zinken nach links, jede hin und zurück", () => {
    expect(font.glyphFor(REPLACEMENT_CHARACTER)).toEqual(
      [
        [6, 4],
        [0, 4],
        [6, 4],
        [6, 3],
        [0, 3],
        [6, 3],
        [6, 2],
        [0, 2],
        [6, 2],
        [6, 1],
        [0, 1],
        [6, 1],
        [6, 0],
        [0, 0],
        [6, 0],
        [6, 4],
      ].map(([x, y]) => ({ x, y })),
    );
  });

  it("deckt mit der Ersatzglyphe das ganze Feld von 7 x 5 Zellen ab", () => {
    const cells = cellsWalkedBy(font.glyphFor(REPLACEMENT_CHARACTER) ?? []);

    expect(new Set(cells).size).toBe(glyphWidthOf(REPLACEMENT_CHARACTER) * GLYPH_HEIGHT);
  });

  it.each(DRAWABLE_CHARACTERS)("hält beim Zeichen %s die Regeln der Schrift ein", (character) => {
    const glyph = font.glyphFor(character) ?? [];

    const first = glyph[0];
    const last = glyph[glyph.length - 1];
    expect(first?.y, "Einstieg in der untersten Zeile").toBe(GLYPH_HEIGHT - 1);
    expect(last?.y, "Ausstieg in der untersten Zeile").toBe(GLYPH_HEIGHT - 1);
    glyph.forEach((waypoint, index) => {
      expect(waypoint.x).toBeGreaterThanOrEqual(0);
      expect(waypoint.x).toBeLessThan(glyphWidthOf(character));
      expect(waypoint.y).toBeGreaterThanOrEqual(0);
      expect(waypoint.y).toBeLessThan(GLYPH_HEIGHT);
      const before = glyph[index - 1];
      if (before) {
        const isStraight = before.x === waypoint.x || before.y === waypoint.y;
        expect(isStraight, "nur waagrecht oder senkrecht").toBe(true);
      }
    });
  });
});
