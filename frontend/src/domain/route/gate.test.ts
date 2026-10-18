import { describe, expect, it } from "vitest";
import { cellOutside, entranceOppositeOf } from "./gate";
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
