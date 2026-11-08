import { describe, expect, it } from "vitest";
import { scriptedRandom } from "../../test-support/scripted-random";
import { placePhoto, ROWS_NEEDED_FOR_PHOTO } from "./photo-layout";
import { GIMMICK_FREE_ROWS } from "./picture-layout";
import { FREE_COLUMNS_BESIDE_TEXT } from "./text-capacity";

describe("placePhoto", () => {
  it("macht das Foto so groß, wie es samt Rahmen und je 1 Reihe Rand passt", () => {
    expect(placePhoto("chris", 85, 15, scriptedRandom())?.size).toBe(11);
    expect(placePhoto("chris", 45, 18, scriptedRandom())?.size).toBe(14);
    // schmal: 3 Spalten Rand und der Rahmen auf jeder Seite
    expect(placePhoto("chris", 20, 40, scriptedRandom())?.size).toBe(12);
  });

  it("legt es senkrecht mittig, die Spalte gewürfelt: ganz links, wenn der Zufall 0 ist …", () => {
    const placed = placePhoto("chris", 85, 15, scriptedRandom(0));

    expect(placed?.left).toBe(4);
    expect(placed?.top).toBe(2);
  });

  it("… und ganz rechts, wenn der Zufall fast 1 ist", () => {
    expect(placePhoto("chris", 85, 15, scriptedRandom(0.9999))?.left).toBe(85 - 4 - 11);
  });

  it("gibt kein Foto, wenn es kleiner als 6 Zellen würde (unter 10 Reihen)", () => {
    expect(placePhoto("chris", 85, 9, scriptedRandom())).toBeUndefined();
    expect(placePhoto("chris", 85, 10, scriptedRandom())?.size).toBe(6);
    expect(ROWS_NEEDED_FOR_PHOTO).toBe(10);
  });

  it("lässt um den Rahmen 3 Spalten und 1 Reihe frei", () => {
    for (let columns = 10; columns <= 90; columns++) {
      for (let rows = 10; rows <= 40; rows += 3) {
        for (const chance of [0, 0.5, 0.9999]) {
          const placed = placePhoto("chris", columns, rows, scriptedRandom(chance));
          if (placed === undefined) continue;
          const frame = {
            left: placed.left - 1,
            right: placed.left + placed.size,
            top: placed.top - 1,
            bottom: placed.top + placed.size,
          };

          expect(frame.left).toBeGreaterThanOrEqual(FREE_COLUMNS_BESIDE_TEXT);
          expect(columns - 1 - frame.right).toBeGreaterThanOrEqual(FREE_COLUMNS_BESIDE_TEXT);
          expect(frame.top).toBeGreaterThanOrEqual(GIMMICK_FREE_ROWS);
          expect(rows - 1 - frame.bottom).toBeGreaterThanOrEqual(GIMMICK_FREE_ROWS);
        }
      }
    }
  });
});
