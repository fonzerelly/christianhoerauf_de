import { describe, expect, it } from "vitest";
import { RectangularGrid } from "./rectangular-grid";

describe("RectangularGrid", () => {
  it("nummeriert die Zellen zeilenweise von oben links", () => {
    const grid = new RectangularGrid(4, 3);

    expect(grid.idOf(0, 0)).toBe(0);
    expect(grid.idOf(3, 0)).toBe(3);
    expect(grid.idOf(0, 1)).toBe(4);
    expect(grid.idOf(3, 2)).toBe(11);
  });

  it("rechnet Nummern in Stellen zurück", () => {
    expect(new RectangularGrid(4, 3).positionOf(6)).toEqual({ x: 2, y: 1 });
  });

  it("weiß, welche Stellen im Raster liegen", () => {
    const grid = new RectangularGrid(4, 3);

    expect(grid.contains(0, 0)).toBe(true);
    expect(grid.contains(3, 2)).toBe(true);
    expect(grid.contains(-1, 0)).toBe(false);
    expect(grid.contains(4, 0)).toBe(false);
    expect(grid.contains(0, -1)).toBe(false);
    expect(grid.contains(0, 3)).toBe(false);
  });

  it("wirft bei einer Stelle außerhalb des Rasters", () => {
    expect(() => new RectangularGrid(4, 3).idOf(4, 0)).toThrow(RangeError);
  });

  it("nennt die Nachbarn in der Reihenfolge rechts, links, unten, oben", () => {
    const grid = new RectangularGrid(3, 3);

    expect(grid.neighboursOf(grid.idOf(1, 1))).toEqual([5, 3, 7, 1]);
  });

  it("lässt am Rand die Nachbarn außerhalb weg", () => {
    const grid = new RectangularGrid(3, 3);

    expect(grid.neighboursOf(grid.idOf(0, 0))).toEqual([1, 3]);
    expect(grid.neighboursOf(grid.idOf(2, 2))).toEqual([7, 5]);
  });

  it("beginnt mit lauter Wänden und unberührten Zellen", () => {
    const grid = new RectangularGrid(2, 2);

    expect(grid.isConnected(0, 1)).toBe(false);
    expect(grid.isConnected(0, 2)).toBe(false);
    expect(grid.isTouched(0)).toBe(false);
    expect(grid.touchedCells()).toEqual([]);
  });

  it("bricht Durchgänge in alle vier Richtungen, von beiden Seiten aus sichtbar", () => {
    const grid = new RectangularGrid(3, 3);
    const middle = grid.idOf(1, 1);

    grid.connect(middle, grid.idOf(2, 1));
    grid.connect(middle, grid.idOf(0, 1));
    grid.connect(middle, grid.idOf(1, 2));
    grid.connect(middle, grid.idOf(1, 0));

    for (const neighbour of grid.neighboursOf(middle)) {
      expect(grid.isConnected(middle, neighbour)).toBe(true);
      expect(grid.isConnected(neighbour, middle)).toBe(true);
    }
    expect(grid.isOpenRight(1, 1)).toBe(true);
    expect(grid.isOpenRight(0, 1)).toBe(true);
    expect(grid.isOpenDown(1, 1)).toBe(true);
    expect(grid.isOpenDown(1, 0)).toBe(true);
    expect(grid.isOpenRight(2, 1)).toBe(false);
    expect(grid.isOpenDown(1, 2)).toBe(false);
  });

  it("berührt beim Brechen eines Durchgangs beide Zellen", () => {
    const grid = new RectangularGrid(3, 1);

    grid.connect(1, 2);

    expect(grid.touchedCells()).toEqual([1, 2]);
    expect(grid.isTouched(0)).toBe(false);
  });

  it("verbindet nur die Zellen, zwischen denen gebrochen wurde", () => {
    const grid = new RectangularGrid(3, 1);

    grid.connect(0, 1);

    expect(grid.isConnected(0, 1)).toBe(true);
    expect(grid.isConnected(1, 2)).toBe(false);
    expect(grid.isConnected(0, 2)).toBe(false);
  });

  it("wirft, wenn die Zellen nicht nebeneinander liegen", () => {
    const grid = new RectangularGrid(3, 3);

    expect(() => {
      grid.connect(0, 4);
    }).toThrow(RangeError);
    expect(() => {
      grid.connect(0, 0);
    }).toThrow(RangeError);
  });

  it("wirft, wenn die Zelle nicht im Raster liegt", () => {
    const grid = new RectangularGrid(2, 2);

    expect(() => grid.isTouched(4)).toThrow(RangeError);
    expect(() => grid.isTouched(-1)).toThrow(RangeError);
  });

  it("berührt eine Zelle ohne Durchgang", () => {
    const grid = new RectangularGrid(2, 2);

    grid.touch(3);

    expect(grid.isTouched(3)).toBe(true);
    expect(grid.touchedCells()).toEqual([3]);
  });

  it("liefert die berührten Zellen nach Nummern geordnet", () => {
    const grid = new RectangularGrid(3, 2);

    grid.touch(4);
    grid.touch(1);

    expect(grid.touchedCells()).toEqual([1, 4]);
  });
});
