import { describe, expect, it } from "vitest";
import { PathFinder } from "./path-finder";
import { RectangularGrid } from "./rectangular-grid";

/**
 * Ein 3 x 3 Labyrinth mit genau einem Weg als Schlange:
 *   0 - 1 - 2
 *           |
 *   5 - 4 - 3
 *   |
 *   6 - 7 - 8
 */
function createSnake(): RectangularGrid {
  const grid = new RectangularGrid(3, 3);
  grid.connect(0, 1);
  grid.connect(1, 2);
  grid.connect(2, 5);
  grid.connect(5, 4);
  grid.connect(4, 3);
  grid.connect(3, 6);
  grid.connect(6, 7);
  grid.connect(7, 8);
  return grid;
}

describe("PathFinder", () => {
  it("findet den Weg durch die offenen Gänge, Anfang und Ende eingeschlossen", () => {
    expect(new PathFinder().find(createSnake(), 0, 8)).toEqual([0, 1, 2, 5, 4, 3, 6, 7, 8]);
  });

  it("findet den Weg auch rückwärts", () => {
    expect(new PathFinder().find(createSnake(), 4, 1)).toEqual([4, 5, 2, 1]);
  });

  it("liefert nur die Startzelle, wenn Start und Ziel dieselbe Zelle sind", () => {
    expect(new PathFinder().find(createSnake(), 3, 3)).toEqual([3]);
  });

  it("nimmt den kürzesten Weg, wenn es Rundwege gibt", () => {
    const grid = new RectangularGrid(2, 2);
    grid.connect(0, 1);
    grid.connect(1, 3);
    grid.connect(0, 2);
    grid.connect(2, 3);

    expect(new PathFinder().find(grid, 0, 3)).toHaveLength(3);
  });

  it("wirft, wenn es keinen Weg gibt", () => {
    const grid = new RectangularGrid(3, 1);
    grid.connect(0, 1);

    expect(() => new PathFinder().find(grid, 0, 2)).toThrow("Kein Weg von Zelle 0 zu Zelle 2");
  });
});
