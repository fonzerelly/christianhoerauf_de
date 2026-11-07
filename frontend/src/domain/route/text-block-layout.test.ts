import { describe, expect, it } from "vitest";
import { layoutTextBlock, lineAdvanceOf, lineLeftIn, lineWidthOf } from "./text-block-layout";

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

  it("rechnet die Ersatzglyphe als zwei Zeichen: 7 Zellen, denn die Lücke dazwischen gehört dazu", () => {
    expect(lineWidthOf("█")).toBe(7);
    expect(lineWidthOf("A█B")).toBe(15);
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

describe("layoutTextBlock mit Lage", () => {
  it("links: Abstand zum Rand 8 % der Breite", () => {
    // 8 % von 60 Spalten = 4,8, gerundet 5
    expect(layoutTextBlock(["AB"], 60, 15, 2, "left")).toMatchObject({ left: 5, right: 11 });
  });

  it("rechts: derselbe Abstand vom rechten Rand", () => {
    expect(layoutTextBlock(["AB"], 60, 15, 2, "right")).toMatchObject({ left: 48, right: 54 });
  });

  it("mittig wie ohne Lage", () => {
    expect(layoutTextBlock(["AB"], 60, 15, 2, "center")).toEqual(
      layoutTextBlock(["AB"], 60, 15, 2),
    );
  });

  it("hält mindestens 4 Spalten Abstand, auch wenn 8 % weniger wären", () => {
    // 8 % von 20 Spalten = 1,6
    expect(layoutTextBlock(["A"], 20, 15, 2, "left").left).toBe(4);
    expect(layoutTextBlock(["A"], 20, 15, 2, "right").right).toBe(15);
  });

  it("lässt bei sehr breitem Text nur die 3 Spalten frei, die An- und Ablauf brauchen", () => {
    // 33 Spalten fassen 7 Zeichen (27 Spalten breit); rechts mit 4 Spalten Abstand begänne er bei 2
    expect(layoutTextBlock(["ABCDEFG"], 33, 15, 2, "right")).toMatchObject({ left: 3, right: 29 });
  });
});

describe("lineLeftIn", () => {
  const block = { left: 10, right: 20, top: 0, bottom: 5 }; // 11 Spalten breit

  it("setzt eine Zeile links-, rechtsbündig oder mittig in den Block", () => {
    expect(lineLeftIn(block, "A", "left")).toBe(10);
    expect(lineLeftIn(block, "A", "right")).toBe(18);
    expect(lineLeftIn(block, "A", "center")).toBe(14);
  });
});
