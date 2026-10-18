import { describe, expect, it } from "vitest";
import { GLYPH_HEIGHT, GLYPH_WIDTH } from "./glyph";
import type { Glyph } from "./glyph";
import { createDefaultFont, REPLACEMENT_CHARACTER } from "./font";

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

  it("lässt den Lichtpunkt für die Ersatzglyphe durch alle 15 Zellen laufen, jede genau einmal", () => {
    const glyph = font.glyphFor(REPLACEMENT_CHARACTER);

    const cells = cellsWalkedBy(glyph ?? []);

    expect(cells).toHaveLength(GLYPH_WIDTH * GLYPH_HEIGHT);
    expect(new Set(cells).size).toBe(GLYPH_WIDTH * GLYPH_HEIGHT);
  });

  it.each(DRAWABLE_CHARACTERS)("hält beim Zeichen %s die Regeln der Schrift ein", (character) => {
    const glyph = font.glyphFor(character) ?? [];

    const first = glyph[0];
    const last = glyph[glyph.length - 1];
    expect(first?.y, "Einstieg in der untersten Zeile").toBe(GLYPH_HEIGHT - 1);
    expect(last?.y, "Ausstieg in der untersten Zeile").toBe(GLYPH_HEIGHT - 1);
    glyph.forEach((waypoint, index) => {
      expect(waypoint.x).toBeGreaterThanOrEqual(0);
      expect(waypoint.x).toBeLessThan(GLYPH_WIDTH);
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
