import { describe, expect, it } from "vitest";
import { RectangularGrid } from "../../src/domain/maze/rectangular-grid";
import type { MazePage } from "../../src/domain/pages/maze-page-generator";
import { renderSvg } from "./svg-diagram";

function tinyPage(): MazePage {
  const grid = new RectangularGrid(3, 2);
  grid.connect(0, 1);
  grid.connect(1, 4);
  return {
    grid,
    route: [
      { x: -1, y: 0, kind: "connector", isDot: false },
      { x: 0, y: 0, kind: "connector", isDot: false },
      { x: 1, y: 0, kind: "letter", isDot: false },
      { x: 1, y: 1, kind: "silent", isDot: true },
    ],
    entrance: { cell: { x: 0, y: 0 }, side: "left" },
    exit: { cell: { x: 2, y: 1 }, side: "right" },
    lines: ["X"],
    lastGlyphEnd: 2,
  };
}

describe("renderSvg", () => {
  const svg = renderSvg(tinyPage(), 10);

  it("liefert ein SVG, dessen Ansicht Platz für die Wegstücke außerhalb des Rasters lässt", () => {
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg" viewBox="-20 -20 70 60"/);
    expect(svg.trimEnd().endsWith("</svg>")).toBe(true);
  });

  it("zeichnet die Wände dünn als Pfad und lässt an den Durchgängen Lücken", () => {
    // Zwischen Zelle 0 und 1 steht in Zeile 0 keine senkrechte Wand, in Zeile 1 schon.
    // Zwischen Spalte 1 und 2 stehen in beiden Zeilen Wände und werden zu einem Strich.
    expect(svg).toContain('class="walls"');
    expect(svg).not.toContain("M10 0v");
    expect(svg).toContain("M10 10v10");
    expect(svg).toContain("M20 0v20");
  });

  it("lässt am Eingang und am Ausgang den Rand offen", () => {
    expect(svg).not.toContain("M0 0v10");
    expect(svg).not.toContain("M30 10v10");
    expect(svg).toContain("M0 10v10");
  });

  it("zeichnet die Route in Rot, getrennt nach Schriftweg, Verbindungsweg und Sprung", () => {
    expect(svg).toContain('class="letter"');
    expect(svg).toContain('class="connector"');
    expect(svg).toContain('class="silent"');
  });

  it("zeichnet Punkte als Kreise", () => {
    expect(svg).toContain('<circle class="dot" cx="15" cy="15"');
  });
});
