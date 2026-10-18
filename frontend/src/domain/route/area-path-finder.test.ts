import { describe, expect, it } from "vitest";
import { MazeGrower } from "../maze/maze-grower";
import { PathFinder } from "../maze/path-finder";
import type { Position } from "../maze/position";
import { WindingPathFinder } from "../maze/winding-path-finder";
import { Mulberry32 } from "../random/mulberry32";
import { AreaPathFinder } from "./area-path-finder";

function createFinder(seed: number, columns = 12, rows = 9): AreaPathFinder {
  const winding = new WindingPathFinder(new MazeGrower(new Mulberry32(seed)), new PathFinder());
  return new AreaPathFinder(columns, rows, winding);
}

const isInBand = ({ x, y }: Position): boolean => x >= 2 && x <= 9 && y >= 3 && y <= 5;

describe("AreaPathFinder", () => {
  it("findet einen Weg von Start nach Ziel als Folge von Stellen", () => {
    const path = createFinder(1).find(isInBand, { x: 2, y: 3 }, { x: 9, y: 5 }, 0.5);

    expect(path[0]).toEqual({ x: 2, y: 3 });
    expect(path.at(-1)).toEqual({ x: 9, y: 5 });
  });

  it("läuft Schritt für Schritt von Zelle zu Nachbarzelle", () => {
    const path = createFinder(2).find(isInBand, { x: 2, y: 3 }, { x: 9, y: 5 }, 1);

    path.slice(1).forEach((position, index) => {
      const before = path[index] ?? { x: -99, y: -99 };
      expect(Math.abs(position.x - before.x) + Math.abs(position.y - before.y)).toBe(1);
    });
  });

  it("bleibt in den erlaubten Zellen", () => {
    for (let seed = 1; seed <= 10; seed++) {
      const path = createFinder(seed).find(isInBand, { x: 2, y: 3 }, { x: 9, y: 5 }, 0.8);

      expect(path.every(isInBand)).toBe(true);
    }
  });

  it("liefert nur eine Stelle, wenn Start und Ziel zusammenfallen", () => {
    expect(createFinder(1).find(isInBand, { x: 4, y: 4 }, { x: 4, y: 4 }, 0.5)).toEqual([
      { x: 4, y: 4 },
    ]);
  });
});
