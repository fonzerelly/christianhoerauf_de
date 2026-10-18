import { describe, expect, it } from "vitest";
import { scriptedRandom } from "../../test-support/scripted-random";
import { BorderCellPicker } from "./border-cell-picker";
import type { Gate } from "./gate";

// Raster der Tests: 34 Spalten, 60 Zeilen. Die Zufallszahlen kommen in der Reihenfolge
// Rand wählen, Spalte wählen, Zeile wählen. Spalte und Zeile werden immer beide gezogen,
// auch wenn eine davon ungenutzt bleibt (Golden Master).
const COLUMNS = 34;
const ROWS = 60;

describe("BorderCellPicker.pickFirstEntrance", () => {
  it("wählt den linken Rand und eine beliebige Zeile", () => {
    const picker = new BorderCellPicker(scriptedRandom(0, 0.5, 0.5));

    // Spalte: 1..16, 0.5 -> 9 (ungenutzt); Zeile: 0..59, 0.5 -> 30
    expect(picker.pickFirstEntrance(COLUMNS, ROWS)).toEqual({
      cell: { x: 0, y: 30 },
      side: "left",
    });
  });

  it("wählt den oberen Rand und eine Spalte in der linken Hälfte", () => {
    const picker = new BorderCellPicker(scriptedRandom(0.4, 0.5, 0.5));

    expect(picker.pickFirstEntrance(COLUMNS, ROWS)).toEqual({ cell: { x: 9, y: 0 }, side: "top" });
  });

  it("wählt den unteren Rand und eine Spalte in der linken Hälfte", () => {
    const picker = new BorderCellPicker(scriptedRandom(0.9, 0, 0));

    expect(picker.pickFirstEntrance(COLUMNS, ROWS)).toEqual({
      cell: { x: 1, y: 59 },
      side: "bottom",
    });
  });
});

describe("BorderCellPicker.pickExit", () => {
  const entranceLeft: Gate = { cell: { x: 0, y: 30 }, side: "left" };

  it("wählt rechts, wenn der Zufall die erste von drei möglichen Seiten trifft", () => {
    const picker = new BorderCellPicker(scriptedRandom(0, 0.5, 0.5));

    // Zeile: 0..59, 0.5 -> 30
    expect(picker.pickExit(entranceLeft, COLUMNS, ROWS)).toEqual({
      cell: { x: 33, y: 30 },
      side: "right",
    });
  });

  it("wählt oben in der rechten Hälfte (Spalten 17 bis 32)", () => {
    const picker = new BorderCellPicker(scriptedRandom(0.4, 0, 0.5));

    expect(picker.pickExit(entranceLeft, COLUMNS, ROWS)).toEqual({
      cell: { x: 17, y: 0 },
      side: "top",
    });
  });

  it("wählt unten in der rechten Hälfte", () => {
    const picker = new BorderCellPicker(scriptedRandom(0.9, 0.9999, 0));

    expect(picker.pickExit(entranceLeft, COLUMNS, ROWS)).toEqual({
      cell: { x: 32, y: 59 },
      side: "bottom",
    });
  });

  it("legt einen Ausgang am selben Rand wie der Eingang rechts vom Eingang", () => {
    const entranceTop: Gate = { cell: { x: 25, y: 0 }, side: "top" };
    const picker = new BorderCellPicker(scriptedRandom(0.4, 0, 0));

    // Spalten oben ab max(17, 26) bis 32
    expect(picker.pickExit(entranceTop, COLUMNS, ROWS)).toEqual({
      cell: { x: 26, y: 0 },
      side: "top",
    });
  });

  it("übergeht einen Rand, an dem rechts vom Eingang kein Platz mehr ist", () => {
    const entranceTop: Gate = { cell: { x: 32, y: 0 }, side: "top" };
    // Möglich bleiben nur right und bottom; 0.6 trifft die zweite
    const picker = new BorderCellPicker(scriptedRandom(0.6, 0, 0));

    expect(picker.pickExit(entranceTop, COLUMNS, ROWS)).toEqual({
      cell: { x: 17, y: 59 },
      side: "bottom",
    });
  });
});
