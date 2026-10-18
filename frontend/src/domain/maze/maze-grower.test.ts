import { describe, expect, it } from "vitest";
import { Mulberry32 } from "../random/mulberry32";
import type { CellGraph } from "./cell-graph";
import { MazeGrower } from "./maze-grower";
import { RectangularGrid } from "./rectangular-grid";

/** Zählt die Durchgänge zwischen benachbarten Zellen (jeden nur einmal). */
function countPassages(grid: RectangularGrid): number {
  let passages = 0;
  for (let cell = 0; cell < grid.columns * grid.rows; cell++) {
    for (const neighbour of grid.neighboursOf(cell)) {
      if (neighbour > cell && grid.isConnected(cell, neighbour)) passages++;
    }
  }
  return passages;
}

/** Wie viele Zellen sind von `start` aus durch Durchgänge erreichbar? */
function countReachable(grid: CellGraph, start: number): number {
  const seen = new Set([start]);
  const queue = [start];
  for (const cell of queue) {
    for (const neighbour of grid.neighboursOf(cell)) {
      if (!seen.has(neighbour) && grid.isConnected(cell, neighbour)) {
        seen.add(neighbour);
        queue.push(neighbour);
      }
    }
  }
  return seen.size;
}

describe("MazeGrower", () => {
  it.each([0, 0.5, 1])(
    "erschließt mit Gewundenheit %s alle Zellen als Baum ohne Rundwege",
    (windiness) => {
      for (let seed = 1; seed <= 5; seed++) {
        const grid = new RectangularGrid(7, 5);
        grid.touch(0);

        new MazeGrower(new Mulberry32(seed)).grow(grid, [0], windiness);

        expect(grid.touchedCells()).toHaveLength(35);
        expect(countPassages(grid)).toBe(34);
        expect(countReachable(grid, 0)).toBe(35);
      }
    },
  );

  it("baut aus derselben Startzelle und demselben Zufall dasselbe Labyrinth", () => {
    const first = new RectangularGrid(6, 6);
    const second = new RectangularGrid(6, 6);

    new MazeGrower(new Mulberry32(9)).grow(first, [0], 0.7);
    new MazeGrower(new Mulberry32(9)).grow(second, [0], 0.7);

    expect(first).toEqual(second);
  });

  it("wächst nicht in Zellen hinein, die schon berührt sind", () => {
    const grid = new RectangularGrid(5, 3);
    for (let row = 0; row < 3; row++) grid.touch(grid.idOf(2, row)); // eine Mauer aus belegten Zellen

    new MazeGrower(new Mulberry32(3)).grow(grid, [grid.idOf(0, 0)], 0.7);

    expect(grid.isTouched(grid.idOf(1, 1))).toBe(true);
    expect(grid.isTouched(grid.idOf(3, 1))).toBe(false);
    expect(grid.isConnected(grid.idOf(1, 0), grid.idOf(2, 0))).toBe(false);
  });

  it("lässt mehrere Startzellen gemeinsam wachsen", () => {
    const grid = new RectangularGrid(6, 1);
    grid.touch(0);
    grid.touch(5);

    new MazeGrower(new Mulberry32(4)).grow(grid, [0, 5], 1);

    expect(grid.touchedCells()).toHaveLength(6);
  });

  it("tut nichts ohne Startzellen", () => {
    const grid = new RectangularGrid(3, 3);

    new MazeGrower(new Mulberry32(1)).grow(grid, [], 0.7);

    expect(grid.touchedCells()).toEqual([]);
  });
});
