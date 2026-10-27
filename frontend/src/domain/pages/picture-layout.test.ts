import { describe, expect, it } from "vitest";
import { ROWS_BELOW_PICTURE } from "../route/route-builder";
import { placePicture } from "./picture-layout";
import { FREE_COLUMNS_BESIDE_TEXT, FREE_ROWS_AROUND_TEXT } from "./text-capacity";

describe("placePicture", () => {
  it("macht das Bild etwa zwei Drittel so groß wie die kürzere Seite, ungerade, und mittig", () => {
    // Desktop: 60 × 34 Zellen. Zwei Drittel von 34 sind 22, ungerade 21.
    const placed = placePicture("heart", 60, 34);

    expect(placed?.picture.width).toBe(21);
    expect(placed?.left).toBe(19);
    // Das Herz ist 19 Zeilen hoch, darunter 3 Zeilen für An- und Ablauf: zusammen 22, mittig in 34.
    expect(placed?.top).toBe(6);
  });

  it("richtet sich am Handy nach der Breite", () => {
    const placed = placePicture("face_with_hand_over_mouth", 34, 61);

    expect(placed?.picture.width).toBe(21);
    expect(placed?.picture.height).toBe(21);
    expect(placed?.left).toBe(6);
  });

  it("gibt kein Bild, wenn es kleiner würde als seine kleinste Größe", () => {
    expect(placePicture("heart", 60, 16)).toBeUndefined();
    expect(placePicture("heart", 60, 17)?.picture.width).toBe(11);
    expect(placePicture("face_with_hand_over_mouth", 60, 25)).toBeUndefined();
    expect(placePicture("face_with_hand_over_mouth", 60, 26)?.picture.width).toBe(17);
  });

  it("lässt rundherum so viel Rand wie beim Text, damit An- und Ablauf vorbeikommen", () => {
    for (let columns = 10; columns <= 80; columns++) {
      for (let rows = 10; rows <= 80; rows += 7) {
        for (const name of ["heart", "face_with_hand_over_mouth"] as const) {
          const placed = placePicture(name, columns, rows);
          if (placed === undefined) continue;
          const { picture, left, top } = placed;
          const bottom = top + picture.height - 1 + ROWS_BELOW_PICTURE;

          expect(left).toBeGreaterThanOrEqual(FREE_COLUMNS_BESIDE_TEXT);
          expect(columns - (left + picture.width)).toBeGreaterThanOrEqual(FREE_COLUMNS_BESIDE_TEXT);
          expect(top).toBeGreaterThanOrEqual(FREE_ROWS_AROUND_TEXT);
          expect(rows - 1 - bottom).toBeGreaterThanOrEqual(FREE_ROWS_AROUND_TEXT);
        }
      }
    }
  });
});
