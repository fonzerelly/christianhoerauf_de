import { describe, expect, it } from "vitest";
import { cellCenterOn, layoutStage } from "./stage-layout";

describe("layoutStage", () => {
  it("teilt eine Handy-Bühne mit fester Spaltenzahl ein: Zellgröße aus der Breite, auf ganze Geräte-Pixel gerundet", () => {
    // 390 px bei Pixeldichte 2: 780 Geräte-Pixel / 34 Spalten = 22,9 => 22 Geräte-Pixel = 11 px je Zelle
    const layout = layoutStage({ width: 390, height: 844 }, 3, 2, { columns: 34 });

    expect(layout).toEqual({
      viewWidth: 390,
      viewHeight: 844,
      pixelRatio: 2,
      cellSize: 11,
      columns: 34,
      rows: 76,
      offsetX: 8,
      offsetY: 4,
    });
  });

  it("teilt eine Desktop-Bühne mit fester Zellgröße ein und zentriert das Raster", () => {
    const layout = layoutStage({ width: 1440, height: 900 }, 1, 3, { cellSize: 24 });

    expect(layout).toMatchObject({
      pixelRatio: 1,
      cellSize: 24,
      columns: 60,
      rows: 37,
      offsetX: 0,
      offsetY: 6,
    });
  });

  it("deckelt die Pixeldichte des Geräts mit dem Höchstwert", () => {
    expect(layoutStage({ width: 1000, height: 500 }, 3, 2, { cellSize: 24 }).pixelRatio).toBe(2);
    expect(layoutStage({ width: 1000, height: 500 }, 1.5, 2, { cellSize: 24 }).pixelRatio).toBe(
      1.5,
    );
  });

  it("nimmt Pixeldichte 1, wenn das Gerät keine nennt (0)", () => {
    expect(layoutStage({ width: 1000, height: 500 }, 0, 3, { cellSize: 24 }).pixelRatio).toBe(1);
  });

  it("macht das Raster nie kleiner als 10 mal 10 Zellen", () => {
    const layout = layoutStage({ width: 100, height: 100 }, 1, 1, { cellSize: 24 });

    expect(layout).toMatchObject({ columns: 10, rows: 10, offsetX: -70, offsetY: -70 });
  });
});

describe("cellCenterOn", () => {
  const layout = layoutStage({ width: 390, height: 844 }, 3, 2, { columns: 34 });

  it("liefert den Mittelpunkt einer Zelle auf der Bühne", () => {
    // Rand (8, 4), Zellen zu 11 Pixeln: Zelle (2, 3) beginnt bei (30, 37), ihre Mitte liegt 5,5 weiter
    expect(cellCenterOn(layout, { x: 2, y: 3 })).toEqual({ x: 35.5, y: 42.5 });
  });

  it("funktioniert auch für Stellen zwischen zwei Zellen", () => {
    expect(cellCenterOn(layout, { x: 2.5, y: 3 })).toEqual({ x: 41, y: 42.5 });
  });
});
