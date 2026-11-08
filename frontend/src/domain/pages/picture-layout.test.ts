import { describe, expect, it } from "vitest";
import { ROWS_BELOW_PICTURE } from "../route/route-builder";
import { GIMMICK_FREE_ROWS, placePicture, rowsNeededForPicture } from "./picture-layout";
import { FREE_COLUMNS_BESIDE_TEXT } from "./text-capacity";

describe("placePicture", () => {
  it("macht das Bild so groß, wie es passt (ungerade Breite), und legt es mittig", () => {
    // Desktop: 85 × 15 Zellen. Das Herz darf mit 3 Zeilen Anlauf und je 1 Zeile Rand 10 hoch sein:
    // 11 breit. 13 breit wäre es 12 hoch.
    const placed = placePicture("heart", 85, 15);

    expect(placed?.picture.width).toBe(11);
    expect(placed?.picture.height).toBe(10);
    expect(placed?.left).toBe(37);
    expect(placed?.top).toBe(1);
  });

  it("wird nie breiter als die Seite ohne je 3 Spalten Rand", () => {
    expect(placePicture("heart", 23, 60)?.picture.width).toBe(17);
    expect(placePicture("heart", 24, 60)?.picture.width).toBe(17);
  });

  it("gibt kein Bild, wenn es kleiner würde als seine kleinste Größe", () => {
    expect(placePicture("heart", 85, 14)).toBeUndefined();
    expect(placePicture("heart", 85, 15)?.picture.width).toBe(11);
    expect(placePicture("face_with_hand_over_mouth", 85, 21)).toBeUndefined();
    expect(placePicture("face_with_hand_over_mouth", 85, 22)?.picture.width).toBe(17);
  });

  it("nennt, wie viele Reihen ein Bild mindestens braucht", () => {
    expect(rowsNeededForPicture("heart")).toBe(15);
    expect(rowsNeededForPicture("face_with_hand_over_mouth")).toBe(22);
  });

  it("lässt 3 Spalten neben und 1 Reihe über und unter dem Bild samt Anlauf frei", () => {
    for (let columns = 10; columns <= 90; columns += 2) {
      for (let rows = 10; rows <= 40; rows += 3) {
        for (const name of ["heart", "face_with_hand_over_mouth"] as const) {
          const placed = placePicture(name, columns, rows);
          if (placed === undefined) continue;
          const { picture, left, top } = placed;
          const bottom = top + picture.height - 1 + ROWS_BELOW_PICTURE;

          expect(left).toBeGreaterThanOrEqual(FREE_COLUMNS_BESIDE_TEXT);
          expect(columns - (left + picture.width)).toBeGreaterThanOrEqual(FREE_COLUMNS_BESIDE_TEXT);
          expect(top).toBeGreaterThanOrEqual(GIMMICK_FREE_ROWS);
          expect(rows - 1 - bottom).toBeGreaterThanOrEqual(GIMMICK_FREE_ROWS);
        }
      }
    }
  });
});
