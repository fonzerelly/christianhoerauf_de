import { describe, expect, it } from "vitest";
import { RectangularGrid } from "../../src/domain/maze/rectangular-grid";
import type { MazePage } from "../../src/domain/pages/maze-page-generator";
import type { RouteStep } from "../../src/domain/route/route-step";
import { checkPageSequence, checkRoute } from "./route-checks";

function step(x: number, y: number): RouteStep {
  return { x, y, kind: "connector", isDot: false };
}

/** Eine Seite von Hand: Raster 4 x 3, Route und Tore frei wählbar, Durchgänge nur dort, wo man sie setzt. */
function pageWith(route: RouteStep[], passages: [number, number][]): MazePage {
  const grid = new RectangularGrid(4, 3);
  for (const [first, second] of passages) grid.connect(first, second);
  return {
    grid,
    route,
    entrance: { cell: { x: 0, y: 1 }, side: "left" },
    exit: { cell: { x: 3, y: 1 }, side: "right" },
    lines: ["X"],
    lastGlyphEnd: 0,
  };
}

// Zellen im 4 x 3 Raster: Zeile 0: 0 1 2 3, Zeile 1: 4 5 6 7, Zeile 2: 8 9 10 11.
/** Höhe des Zeilenwechsel-Bands; hier ohne Bedeutung, weil die Seiten keinen Text haben, der zählt. */
const BAND = 2;
const STRAIGHT_ROUTE = [
  step(-2, 1),
  step(-1, 1),
  step(0, 1),
  step(1, 1),
  step(2, 1),
  step(3, 1),
  step(4, 1),
  step(5, 1),
];
const STRAIGHT_PASSAGES: [number, number][] = [
  [4, 5],
  [5, 6],
  [6, 7],
];
// Dazu alle übrigen Zellen als Baum: obere und untere Reihe hängen an der mittleren.
const FULL_MAZE: [number, number][] = [
  ...STRAIGHT_PASSAGES,
  [0, 4],
  [1, 5],
  [2, 6],
  [3, 7],
  [8, 4],
  [9, 5],
  [10, 6],
  [11, 7],
];

describe("checkRoute", () => {
  it("findet bei einer einwandfreien Route nichts auszusetzen", () => {
    expect(checkRoute(pageWith(STRAIGHT_ROUTE, FULL_MAZE), BAND)).toEqual([]);
  });

  it("meldet eine Lücke in der Route", () => {
    const withGap = [...STRAIGHT_ROUTE.slice(0, 4), ...STRAIGHT_ROUTE.slice(5)];

    expect(checkRoute(pageWith(withGap, FULL_MAZE), BAND).join("\n")).toContain("Lücke");
  });

  it("meldet einen Schritt durch eine Wand", () => {
    const withoutPassage = FULL_MAZE.filter(([first, second]) => !(first === 5 && second === 6));

    expect(checkRoute(pageWith(STRAIGHT_ROUTE, withoutPassage), BAND).join("\n")).toContain("Wand");
  });

  it("meldet eine Route, die sich kreuzt", () => {
    // Die Route läuft durch Zelle 5 von links nach rechts und später von oben nach unten.
    const crossing = [
      step(-2, 1),
      step(-1, 1),
      step(0, 1),
      step(1, 1),
      step(2, 1),
      step(2, 0),
      step(1, 0),
      step(1, 1),
      step(1, 2),
      step(2, 2),
      step(2, 1),
      step(3, 1),
      step(4, 1),
      step(5, 1),
    ];

    // Ohne Textzeilen gibt es keine Glyphen-Felder, in denen Kreuzungen erlaubt wären.
    const withoutText: MazePage = { ...pageWith(crossing, FULL_MAZE), lines: [] };

    expect(checkRoute(withoutText, BAND).join("\n")).toContain("kreuzt");
  });

  it("erlaubt Kreuzungen innerhalb des Felds einer Glyphe, wie bei B, D und I", () => {
    const crossing = [
      step(-2, 1),
      step(-1, 1),
      step(0, 1),
      step(1, 1),
      step(2, 1),
      step(2, 0),
      step(1, 0),
      step(1, 1),
      step(1, 2),
      step(2, 2),
      step(2, 1),
      step(3, 1),
      step(4, 1),
      step(5, 1),
    ];

    expect(checkRoute(pageWith(crossing, FULL_MAZE), BAND).join("\n")).not.toContain("kreuzt");
  });

  it("meldet eine Route, die zwischendurch das Raster verlässt", () => {
    const leaving = [
      ...STRAIGHT_ROUTE.slice(0, 4),
      step(1, 0),
      step(1, -1),
      step(1, 0),
      ...STRAIGHT_ROUTE.slice(4),
    ];

    expect(checkRoute(pageWith(leaving, FULL_MAZE), BAND).join("\n")).toContain("außerhalb");
  });

  it("meldet, wenn die Route nicht am Eingang beginnt", () => {
    const wrongStart = [step(-2, 2), step(-1, 2), step(0, 2), ...STRAIGHT_ROUTE.slice(3)];

    expect(checkRoute(pageWith(wrongStart, FULL_MAZE), BAND).join("\n")).toContain("Eingang");
  });

  it("meldet, wenn die Route nicht am Ausgang endet", () => {
    const wrongEnd = STRAIGHT_ROUTE.slice(0, 4);

    expect(checkRoute(pageWith(wrongEnd, FULL_MAZE), BAND).join("\n")).toContain("Ausgang");
  });

  it("meldet Zellen, die vom Eingang aus nicht erreichbar sind", () => {
    const withIsland = FULL_MAZE.filter(([first, second]) => !(first === 11 && second === 7));

    expect(checkRoute(pageWith(STRAIGHT_ROUTE, withIsland), BAND).join("\n")).toContain(
      "erreichbar",
    );
  });
});

describe("checkPageSequence", () => {
  const first = pageWith(STRAIGHT_ROUTE, FULL_MAZE);

  it("findet nichts auszusetzen, wenn der Eingang dem vorigen Ausgang gegenüberliegt", () => {
    expect(checkPageSequence([first, first])).toEqual([]);
  });

  it("meldet einen Eingang, der nicht gegenüber dem vorigen Ausgang liegt", () => {
    const shifted: MazePage = { ...first, entrance: { cell: { x: 0, y: 2 }, side: "left" } };

    expect(checkPageSequence([first, shifted]).join("\n")).toContain("gegenüber");
  });

  it("meldet einen Eingang am falschen Rand", () => {
    const wrongSide: MazePage = { ...first, entrance: { cell: { x: 0, y: 1 }, side: "top" } };

    expect(checkPageSequence([first, wrongSide]).join("\n")).toContain("gegenüber");
  });
});
