import { describe, expect, it } from "vitest";
import { Mulberry32 } from "../random/mulberry32";
import { MazeGrower } from "./maze-grower";
import { PathFinder } from "./path-finder";
import { RectangularGrid } from "./rectangular-grid";
import { WindingPathFinder } from "./winding-path-finder";

function createFinder(seed: number): WindingPathFinder {
  return new WindingPathFinder(new MazeGrower(new Mulberry32(seed)), new PathFinder());
}

describe("WindingPathFinder", () => {
  it("findet einen Weg von Start nach Ziel, in dem jeder Schritt zu einer Nachbarzelle führt", () => {
    for (let seed = 1; seed <= 10; seed++) {
      const grid = new RectangularGrid(8, 6);
      const from = grid.idOf(0, 0);
      const to = grid.idOf(7, 5);

      const path = createFinder(seed).find(grid, from, to, 0.7);

      expect(path[0]).toBe(from);
      expect(path.at(-1)).toBe(to);
      path.slice(1).forEach((cell, index) => {
        expect(grid.neighboursOf(path[index] ?? -1)).toContain(cell);
      });
    }
  });

  it("läuft nicht über Zellen, die vorher als belegt berührt wurden", () => {
    const grid = new RectangularGrid(5, 5);
    for (let column = 0; column < 4; column++) grid.touch(grid.idOf(column, 2)); // Riegel mit Lücke rechts

    const path = createFinder(2).find(grid, grid.idOf(0, 0), grid.idOf(0, 4), 1);

    const blocked = [0, 1, 2, 3].map((column) => grid.idOf(column, 2));
    expect(path.some((cell) => blocked.includes(cell))).toBe(false);
    expect(path).toContain(grid.idOf(4, 2));
  });

  it("liefert mit demselben Zufall denselben Weg", () => {
    const first = createFinder(5).find(new RectangularGrid(6, 6), 0, 35, 0.3);
    const second = createFinder(5).find(new RectangularGrid(6, 6), 0, 35, 0.3);

    expect(first).toEqual(second);
  });

  it("liefert nur die Startzelle, wenn Start und Ziel zusammenfallen", () => {
    expect(createFinder(1).find(new RectangularGrid(3, 3), 4, 4, 0.5)).toEqual([4]);
  });
});
