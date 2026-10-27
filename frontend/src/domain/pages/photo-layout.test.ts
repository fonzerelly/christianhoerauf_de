import { describe, expect, it } from "vitest";
import { scriptedRandom } from "../../test-support/scripted-random";
import { placePhoto } from "./photo-layout";
import { FREE_COLUMNS_BESIDE_TEXT, FREE_ROWS_AROUND_TEXT } from "./text-capacity";

describe("placePhoto", () => {
  it("macht das Foto zwei Fünftel so groß wie die kürzere Seite (abgerundet), quadratisch", () => {
    // Desktop: 80 × 36 Zellen. Zwei Fünftel von 36 sind 14,4.
    expect(placePhoto("chris", 80, 36, scriptedRandom())?.size).toBe(14);
    // Handy: 32 Spalten.
    expect(placePhoto("chris", 32, 61, scriptedRandom())?.size).toBe(12);
  });

  it("legt das Foto an eine zufällige Stelle: ganz links oben, wenn der Zufall 0 ist", () => {
    // Rahmen eine Zelle ums Foto, daneben 3 Spalten und darüber 2 Zeilen frei.
    const placed = placePhoto("chris", 80, 36, scriptedRandom(0, 0));

    expect(placed?.left).toBe(4);
    expect(placed?.top).toBe(3);
  });

  it("… und ganz rechts unten, wenn der Zufall fast 1 ist (erst die Spalte, dann die Zeile)", () => {
    const placed = placePhoto("chris", 80, 36, scriptedRandom(0.9999, 0.9999));

    expect(placed?.left).toBe(80 - 4 - 14);
    expect(placed?.top).toBe(36 - 3 - 14);
  });

  it("gibt kein Foto, wenn es kleiner als 6 Zellen würde", () => {
    expect(placePhoto("chris", 80, 14, scriptedRandom())).toBeUndefined();
    expect(placePhoto("chris", 80, 15, scriptedRandom())?.size).toBe(6);
  });

  it("lässt um den Rahmen so viel Rand wie beim Text, damit An- und Ablauf vorbeikommen", () => {
    for (let columns = 10; columns <= 80; columns++) {
      for (let rows = 10; rows <= 80; rows += 7) {
        for (const chance of [0, 0.5, 0.9999]) {
          const placed = placePhoto("chris", columns, rows, scriptedRandom(chance, chance));
          if (placed === undefined) continue;
          const frame = {
            left: placed.left - 1,
            right: placed.left + placed.size,
            top: placed.top - 1,
            bottom: placed.top + placed.size,
          };

          expect(frame.left).toBeGreaterThanOrEqual(FREE_COLUMNS_BESIDE_TEXT);
          expect(columns - 1 - frame.right).toBeGreaterThanOrEqual(FREE_COLUMNS_BESIDE_TEXT);
          expect(frame.top).toBeGreaterThanOrEqual(FREE_ROWS_AROUND_TEXT);
          expect(rows - 1 - frame.bottom).toBeGreaterThanOrEqual(FREE_ROWS_AROUND_TEXT);
        }
      }
    }
  });
});
