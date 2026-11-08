import { describe, expect, it } from "vitest";
import { cellCenterOn, layoutStage, pageLayoutOf } from "./stage-layout";

describe("layoutStage", () => {
  it("teilt eine Handy-Bühne mit fester Spaltenzahl ein: Zellgröße aus der Breite, auf ganze Geräte-Pixel gerundet", () => {
    // 390 px bei Pixeldichte 2: 780 Geräte-Pixel / 45 Spalten = 17,3 => 17 Geräte-Pixel = 8,5 px je Zelle
    const layout = layoutStage(390, 3, 2, { columns: 45 }, 18);

    expect(layout).toEqual({
      viewWidth: 390,
      viewHeight: 153,
      pixelRatio: 2,
      cellSize: 8.5,
      columns: 45,
      rows: 18,
      offsetX: 3, // (390 - 45 × 8,5) / 2 = 3,75, auf ganze Pixel abgerundet
      offsetY: 0,
    });
  });

  it("teilt eine Desktop-Bühne mit fester Zellgröße ein und zentriert das Raster waagrecht", () => {
    const layout = layoutStage(1450, 1, 3, { cellSize: 16 }, 15);

    expect(layout).toEqual({
      viewWidth: 1450,
      viewHeight: 240,
      pixelRatio: 1,
      cellSize: 16,
      columns: 90,
      rows: 15,
      offsetX: 5,
      offsetY: 0,
    });
  });

  it("ist genau so hoch wie die Reihen, egal wie breit", () => {
    expect(layoutStage(800, 1, 3, { cellSize: 16 }, 15).viewHeight).toBe(240);
    expect(layoutStage(2400, 1, 3, { cellSize: 16 }, 15).viewHeight).toBe(240);
  });

  it("deckelt die Pixeldichte des Geräts mit dem Höchstwert", () => {
    expect(layoutStage(1000, 3, 2, { cellSize: 24 }, 10).pixelRatio).toBe(2);
    expect(layoutStage(1000, 1.5, 2, { cellSize: 24 }, 10).pixelRatio).toBe(1.5);
  });

  it("nimmt Pixeldichte 1, wenn das Gerät keine nennt (0)", () => {
    expect(layoutStage(1000, 0, 3, { cellSize: 24 }, 10).pixelRatio).toBe(1);
  });

  it("macht das Raster nie schmaler als 10 Spalten", () => {
    const layout = layoutStage(100, 1, 1, { cellSize: 24 }, 10);

    expect(layout).toMatchObject({ columns: 10, offsetX: -70 });
  });
});

describe("cellCenterOn", () => {
  const layout = layoutStage(1450, 1, 3, { cellSize: 16 }, 15);

  it("liefert den Mittelpunkt einer Zelle auf der Bühne", () => {
    // Rand (5, 0), Zellen zu 16 Pixeln: Zelle (2, 3) beginnt bei (37, 48), ihre Mitte liegt 8 weiter
    expect(cellCenterOn(layout, { x: 2, y: 3 })).toEqual({ x: 45, y: 56 });
  });

  it("funktioniert auch für Stellen zwischen zwei Zellen", () => {
    expect(cellCenterOn(layout, { x: 2.5, y: 3 })).toEqual({ x: 53, y: 56 });
  });
});

describe("pageLayoutOf", () => {
  // Desktop: 85 × 15 Zellen zu 16 px, Pixeldichte 2; Labyrinth-Fläche 1360 × 240 px
  const STAGE = layoutStage(1366, 2, 2, { cellSize: 16 }, 15);

  it("lässt die Einteilung der Bühne für eine Seite im Raster der Bühne", () => {
    expect(pageLayoutOf(STAGE, { columns: 85, rows: 15 }, undefined)).toBe(STAGE);
  });

  it("gibt einer Seite im feineren Raster die größte Zelle, die passt, und stellt sie mittig", () => {
    // 2720 Geräte-Pixel / 124 = 21,9 und 480 / 22 = 21,8 => 21 Geräte-Pixel = 10,5 px
    const layout = pageLayoutOf(STAGE, { columns: 124, rows: 22 }, 15 / 22);

    expect(layout).toEqual({
      ...STAGE,
      cellSize: 10.5,
      columns: 124,
      rows: 22,
      offsetX: 3 + 29, // (1360 - 124 × 10,5) / 2 = 29
      offsetY: 4, // (240 - 22 × 10,5) / 2 = 4,5, abgerundet
    });
  });
});
