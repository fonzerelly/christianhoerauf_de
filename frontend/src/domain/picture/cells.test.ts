import { describe, expect, it } from "vitest";
import { cellsOnCurve, cellsOnLine, closeByMirroring, isSameCell } from "./cells";

const key = ({ x, y }: { x: number; y: number }): string => `${String(x)},${String(y)}`;

describe("cellsOnLine", () => {
  it("läuft waagrecht Zelle für Zelle, Anfang und Ende eingeschlossen", () => {
    expect(cellsOnLine({ x: 0, y: 2 }, { x: 3, y: 2 }).map(key)).toEqual([
      "0,2",
      "1,2",
      "2,2",
      "3,2",
    ]);
  });

  it("läuft schräg als Treppe, nah an der geraden Linie, zuerst waagrecht", () => {
    expect(cellsOnLine({ x: 0, y: 0 }, { x: 2, y: 2 }).map(key)).toEqual([
      "0,0",
      "1,0",
      "1,1",
      "2,1",
      "2,2",
    ]);
  });

  it("macht bei einer flachen Schräge mehr waagrechte als senkrechte Stufen", () => {
    expect(cellsOnLine({ x: 4, y: 1 }, { x: 0, y: 0 }).map(key)).toEqual([
      "4,1",
      "3,1",
      "2,1",
      "2,0",
      "1,0",
      "0,0",
    ]);
  });

  it("liefert nur die eine Zelle, wenn Anfang und Ende gleich sind", () => {
    expect(cellsOnLine({ x: 5, y: 5 }, { x: 5, y: 5 }).map(key)).toEqual(["5,5"]);
  });
});

describe("cellsOnCurve", () => {
  it("nimmt die Zelle, in der ein Punkt liegt, und verbindet Lücken mit Nachbarzellen", () => {
    const cells = cellsOnCurve([
      { x: 0.5, y: 0.5 },
      { x: 0.9, y: 0.5 },
      { x: 2.5, y: 0.5 },
      { x: 2.5, y: 1.5 },
    ]);

    expect(cells.map(key)).toEqual(["0,0", "1,0", "2,0", "2,1"]);
  });

  it("lässt eine Zacke aus einer einzigen Zelle weg", () => {
    const cells = cellsOnCurve([
      { x: 0.5, y: 0.5 },
      { x: 1.2, y: 0.5 },
      { x: 0.8, y: 0.5 },
      { x: 0.8, y: 1.5 },
    ]);

    expect(cells.map(key)).toEqual(["0,0", "0,1"]);
  });

  it("behält einen Weg, der länger als eine Zelle auf sich zurückläuft", () => {
    const cells = cellsOnCurve([
      { x: 0.5, y: 0.5 },
      { x: 2.5, y: 0.5 },
      { x: 0.5, y: 0.5 },
    ]);

    expect(cells.map(key)).toEqual(["0,0", "1,0", "2,0", "1,0", "0,0"]);
  });
});

describe("closeByMirroring", () => {
  it("hängt das Spiegelbild der linken Hälfte rückwärts an, ohne die oberste Zelle doppelt", () => {
    const leftHalf = [
      { x: 2, y: 2 },
      { x: 1, y: 2 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ];

    expect(closeByMirroring(leftHalf, 5).map(key)).toEqual([
      "2,2",
      "1,2",
      "1,1",
      "2,1",
      "3,1",
      "3,2",
      "2,2",
    ]);
  });

  it("glättet eine Zacke aus einer Zelle an der Naht oben in der Mitte", () => {
    const leftHalf = [
      { x: 2, y: 3 },
      { x: 1, y: 3 },
      { x: 1, y: 2 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
      { x: 2, y: 2 },
    ];

    expect(closeByMirroring(leftHalf, 5).map(key)).toEqual([
      "2,3",
      "1,3",
      "1,2",
      "1,1",
      "2,1",
      "3,1",
      "3,2",
      "3,3",
      "2,3",
    ]);
  });
});

describe("isSameCell", () => {
  it("vergleicht Spalte und Zeile", () => {
    expect(isSameCell({ x: 1, y: 2 }, { x: 1, y: 2 })).toBe(true);
    expect(isSameCell({ x: 1, y: 2 }, { x: 2, y: 1 })).toBe(false);
  });
});
