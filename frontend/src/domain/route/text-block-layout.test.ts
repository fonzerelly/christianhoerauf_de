import { describe, expect, it } from "vitest";
import { layoutTextBlock, lineAdvanceOf, lineLeftOf, lineWidthOf } from "./text-block-layout";

describe("lineAdvanceOf", () => {
  it("zählt Glyphenhöhe, Grundlinie und Zeilenwechsel-Band zusammen", () => {
    expect(lineAdvanceOf(1)).toBe(7);
    expect(lineAdvanceOf(2)).toBe(8);
  });
});

describe("lineWidthOf", () => {
  it("rechnet 4 Zellen je Zeichen, aber ohne Lücke hinter dem letzten", () => {
    expect(lineWidthOf("A")).toBe(3);
    expect(lineWidthOf("AB")).toBe(7);
    expect(lineWidthOf("ABC D")).toBe(19);
  });
});

describe("lineLeftOf", () => {
  it("zentriert die Zeile im Raster und rundet nach unten", () => {
    expect(lineLeftOf("AB", 34)).toBe(13);
    expect(lineLeftOf("C", 34)).toBe(15);
    expect(lineLeftOf("C", 35)).toBe(16);
  });
});

describe("layoutTextBlock", () => {
  it("zentriert den Textblock im Raster und nennt seine äußersten Zellen", () => {
    expect(layoutTextBlock(["AB", "C"], 34, 60, 2)).toEqual({
      left: 13,
      right: 19,
      top: 23,
      bottom: 36,
    });
  });

  it("richtet die Breite nach der längsten Zeile", () => {
    const block = layoutTextBlock(["A", "ABC", "AB"], 40, 40, 1);

    expect(block.right - block.left + 1).toBe(11);
  });

  it("zählt unter der letzten Zeile kein Band", () => {
    const block = layoutTextBlock(["A"], 20, 20, 3);

    expect(block.bottom - block.top + 1).toBe(6);
  });
});
