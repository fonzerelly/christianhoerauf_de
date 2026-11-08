import { describe, expect, it } from "vitest";
import { cellOutside, entranceOppositeOf, outwardOf } from "./gate";
import { gateInGrid } from "./gate";
import type { Gate } from "./gate";

describe("cellOutside", () => {
  it.each([
    [{ cell: { x: 0, y: 7 }, side: "left" }, 2, { x: -2, y: 7 }],
    [{ cell: { x: 33, y: 7 }, side: "right" }, 1, { x: 34, y: 7 }],
    [{ cell: { x: 9, y: 0 }, side: "top" }, 2, { x: 9, y: -2 }],
    [{ cell: { x: 9, y: 59 }, side: "bottom" }, 2, { x: 9, y: 61 }],
  ] satisfies [Gate, number, { x: number; y: number }][])(
    "liegt außerhalb des Rands: %j, Abstand %d",
    (gate, distance, expected) => {
      expect(cellOutside(gate, distance)).toEqual(expected);
    },
  );
});

describe("outwardOf", () => {
  it.each([
    ["left", { x: -1, y: 0 }],
    ["right", { x: 1, y: 0 }],
    ["top", { x: 0, y: -1 }],
    ["bottom", { x: 0, y: 1 }],
  ] satisfies [Gate["side"], { x: number; y: number }][])(
    "zeigt am Rand %s in die Richtung %j",
    (side, expected) => {
      expect(outwardOf(side)).toEqual(expected);
    },
  );
});

describe("entranceOppositeOf", () => {
  it("setzt den Eingang auf die gegenüberliegende Seite, in dieselbe Zeile", () => {
    expect(entranceOppositeOf({ cell: { x: 33, y: 10 }, side: "right" }, 34, 60)).toEqual({
      cell: { x: 0, y: 10 },
      side: "left",
    });
  });

  it("setzt den Eingang nach links verlassener Seite auf den rechten Rand", () => {
    expect(entranceOppositeOf({ cell: { x: 0, y: 10 }, side: "left" }, 34, 60)).toEqual({
      cell: { x: 33, y: 10 },
      side: "right",
    });
  });

  it("setzt den Eingang nach unten verlassener Seite an den oberen Rand, in dieselbe Spalte", () => {
    expect(entranceOppositeOf({ cell: { x: 5, y: 59 }, side: "bottom" }, 34, 60)).toEqual({
      cell: { x: 5, y: 0 },
      side: "top",
    });
  });

  it("setzt den Eingang nach oben verlassener Seite an den unteren Rand", () => {
    expect(entranceOppositeOf({ cell: { x: 5, y: 0 }, side: "top" }, 34, 60)).toEqual({
      cell: { x: 5, y: 59 },
      side: "bottom",
    });
  });
});

describe("gateInGrid", () => {
  const STAGE = { columns: 85, rows: 15 };
  const FINE = { columns: 124, rows: 22 };

  it("rechnet ein Tor an der Seite in ein feineres Raster um: dieselbe Höhe, der Rand des neuen", () => {
    // Mitte von Reihe 12 liegt bei 12,5 / 15 der Höhe; im Raster mit 22 Reihen in Reihe 18.
    expect(gateInGrid({ cell: { x: 84, y: 12 }, side: "right" }, STAGE, FINE)).toEqual({
      cell: { x: 123, y: 18 },
      side: "right",
    });
    expect(gateInGrid({ cell: { x: 0, y: 12 }, side: "left" }, STAGE, FINE).cell.x).toBe(0);
  });

  it("rechnet zurück ins gröbere Raster und bleibt im Raster", () => {
    expect(gateInGrid({ cell: { x: 123, y: 21 }, side: "right" }, FINE, STAGE).cell).toEqual({
      x: 84,
      y: 14,
    });
  });

  it("rechnet ein Tor oben oder unten nach der Spalte um", () => {
    expect(gateInGrid({ cell: { x: 42, y: 14 }, side: "bottom" }, STAGE, FINE)).toEqual({
      cell: { x: 62, y: 21 }, // 42,5 × 124 / 85 = 62
      side: "bottom",
    });
    expect(gateInGrid({ cell: { x: 42, y: 0 }, side: "top" }, STAGE, FINE).cell.y).toBe(0);
  });
});
