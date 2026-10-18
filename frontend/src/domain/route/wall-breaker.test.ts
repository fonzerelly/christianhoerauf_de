import { describe, expect, it } from "vitest";
import { RectangularGrid } from "../maze/rectangular-grid";
import { scriptedRandom } from "../../test-support/scripted-random";
import type { RouteStep } from "./route-step";
import { WallBreaker } from "./wall-breaker";

/** Eine waagrechte Route von x = `from` bis `to` in Zeile `y`. */
function horizontalRoute(y: number, from: number, to: number): RouteStep[] {
  return Array.from({ length: to - from + 1 }, (_, index) => ({
    x: from + index,
    y,
    kind: "connector" as const,
    isDot: false,
  }));
}

/** Bricht die Wände entlang der Route heraus, so wie es der Seitenbau vor dem Wachsen tut. */
function carveRoute(grid: RectangularGrid, route: readonly RouteStep[]): void {
  route.slice(1).forEach((step, index) => {
    const before = route[index];
    if (before && grid.contains(before.x, before.y) && grid.contains(step.x, step.y)) {
      grid.connect(grid.idOf(before.x, before.y), grid.idOf(step.x, step.y));
    }
  });
}

/** Die Spalten, in denen in Zeile `y` ein Durchgang nach unten besteht. */
function openColumnsBelow(grid: RectangularGrid, y: number): number[] {
  return Array.from({ length: grid.columns }, (_, x) => x).filter((x) => grid.isOpenDown(x, y));
}

describe("WallBreaker", () => {
  // Eine Zeile Text: Grundlinie in Zeile 5, Textblock Spalten 3 bis 16.
  const block = { left: 3, right: 16, top: 0, bottom: 5 };

  it("unterbricht die Wand unter der Grundlinie nach jeweils höchstens maxWallRun Zellen", () => {
    const grid = new RectangularGrid(20, 12);
    const route = horizontalRoute(5, 2, 17);
    carveRoute(grid, route);
    // Der Zufall liefert immer 0: Stücke von der kürzesten erlaubten Länge, ceil(3 / 2) = 2
    const breaker = new WallBreaker(scriptedRandom(), { maxWallRun: 3, returnBandRows: 1 });

    breaker.breakUpLongWalls(grid, route, 1, block);

    expect(openColumnsBelow(grid, 5)).toEqual([4, 7, 10, 13, 16]);
  });

  it("zählt ein Wandstück nicht weiter, wenn darunter schon ein Durchgang besteht", () => {
    const grid = new RectangularGrid(20, 12);
    const route = horizontalRoute(5, 2, 17);
    carveRoute(grid, route);
    grid.connect(grid.idOf(3, 5), grid.idOf(3, 6));
    const breaker = new WallBreaker(scriptedRandom(), { maxWallRun: 3, returnBandRows: 1 });

    breaker.breakUpLongWalls(grid, route, 1, block);

    expect(openColumnsBelow(grid, 5).slice(0, 2)).toEqual([3, 6]);
  });

  it("würfelt die Länge des nächsten Stücks nach jeder Lücke neu", () => {
    const grid = new RectangularGrid(20, 12);
    const route = horizontalRoute(5, 2, 17);
    carveRoute(grid, route);
    // Erste Länge (Zeilenanfang): 2 (Zufall 0); danach 3 (Zufall 0.99); dann wieder 2 (Zufall 0)
    const breaker = new WallBreaker(scriptedRandom(0, 0.99, 0), {
      maxWallRun: 3,
      returnBandRows: 1,
    });

    breaker.breakUpLongWalls(grid, route, 1, block);

    // x = 2, 3 zählen, bei 4 Lücke (Länge 2); dann x = 5, 6, 7 zählen, bei 8 Lücke (Länge 3);
    // dann (Zufall 0 -> Länge 2) x = 9, 10, bei 11 Lücke; usw.
    expect(openColumnsBelow(grid, 5).slice(0, 3)).toEqual([4, 8, 11]);
  });

  it("lässt die Wände unberührt und zieht keine Zufallszahl, wenn maxWallRun 0 ist", () => {
    const grid = new RectangularGrid(20, 12);
    const route = horizontalRoute(5, 2, 17);
    carveRoute(grid, route);
    const forbiddenRandom = {
      next: (): number => {
        throw new Error("es darf nichts gezogen werden");
      },
    };
    const breaker = new WallBreaker(forbiddenRandom, { maxWallRun: 0, returnBandRows: 1 });

    breaker.breakUpLongWalls(grid, route, 1, block);

    expect(openColumnsBelow(grid, 5)).toEqual([]);
  });

  it("behandelt Grundlinien und Bänder, aber keine anderen Zeilen", () => {
    // Zwei Zeilen Text, Band 1 Zeile hoch: Grundlinien in Zeile 5 und 12, Band in Zeile 6.
    const grid = new RectangularGrid(20, 16);
    const route = [2, 3, 6, 7, 8, 12].flatMap((y) => horizontalRoute(y, 2, 17));
    const twoLines = { left: 3, right: 16, top: 0, bottom: 12 };
    const breaker = new WallBreaker(scriptedRandom(), { maxWallRun: 3, returnBandRows: 1 });

    breaker.breakUpLongWalls(grid, route, 2, twoLines);

    for (const y of [5, 6, 12])
      expect(openColumnsBelow(grid, y).length, `Zeile ${String(y)}`).toBeGreaterThan(0);
    for (const y of [7, 8]) expect(openColumnsBelow(grid, y), `Zeile ${String(y)}`).toEqual([]);
  });

  it("zählt eine Wand auch dann, wenn die Route nur unter ihr verläuft", () => {
    const grid = new RectangularGrid(20, 12);
    const routeBelow = horizontalRoute(6, 2, 17);
    const breaker = new WallBreaker(scriptedRandom(), { maxWallRun: 3, returnBandRows: 1 });

    breaker.breakUpLongWalls(grid, routeBelow, 1, block);

    expect(openColumnsBelow(grid, 5)).toEqual([4, 7, 10, 13, 16]);
  });

  it("ignoriert Wegstücke außerhalb des Rasters", () => {
    const grid = new RectangularGrid(20, 12);
    const route = [
      { x: -2, y: 5, kind: "connector" as const, isDot: false },
      ...horizontalRoute(5, 2, 17),
    ];
    const breaker = new WallBreaker(scriptedRandom(), { maxWallRun: 3, returnBandRows: 1 });

    breaker.breakUpLongWalls(grid, route, 1, block);

    expect(openColumnsBelow(grid, 5)).toEqual([4, 7, 10, 13, 16]);
  });
});
