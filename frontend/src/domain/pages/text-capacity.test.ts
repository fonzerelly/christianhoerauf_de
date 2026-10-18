import { describe, expect, it } from "vitest";
import { textCapacityOf } from "./text-capacity";

describe("textCapacityOf", () => {
  it("rechnet Zeichen je Zeile und Zeilen je Seite für das Handy-Raster", () => {
    // Spalten: 34 - 2 * 3 frei = 28 nutzbar, (28 + 1) / 4 = 7 Zeichen.
    // Zeilen: 60 - 2 * 2 frei = 56 nutzbar, (56 + 2) / 8 = 7 Zeilen.
    expect(textCapacityOf(34, 60, 2)).toEqual({ charsPerLine: 7, linesPerPage: 7 });
  });

  it("rechnet für ein breites Raster", () => {
    expect(textCapacityOf(60, 34, 2)).toEqual({ charsPerLine: 13, linesPerPage: 4 });
  });

  it("richtet die Zeilenzahl nach der Höhe des Zeilenwechsel-Bands", () => {
    expect(textCapacityOf(34, 60, 1).linesPerPage).toBe(8);
    expect(textCapacityOf(34, 60, 4).linesPerPage).toBe(6);
  });

  it("lässt in einem kleinen Raster mindestens ein Zeichen in einer Zeile zu", () => {
    expect(textCapacityOf(10, 10, 2)).toEqual({ charsPerLine: 1, linesPerPage: 1 });
  });

  it("liefert auch in einem winzigen Raster mindestens 1", () => {
    expect(textCapacityOf(3, 3, 2)).toEqual({ charsPerLine: 1, linesPerPage: 1 });
  });
});
