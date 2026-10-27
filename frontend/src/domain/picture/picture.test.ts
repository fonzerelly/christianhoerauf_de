import { describe, expect, it } from "vitest";
import { lastOf } from "../lists";
import { heartHeightOf } from "./heart";
import { drawPicture, glyphOfStrokes, SMALLEST_SIZE } from "./picture";

const key = ({ x, y, marker }: { x: number; y: number; marker?: string }): string =>
  `${String(x)},${String(y)}${marker === undefined ? "" : ` ${marker}`}`;

describe("glyphOfStrokes", () => {
  it("läuft die Striche ab und springt ohne Leuchtspur über eine Ecke zum nächsten und zurück", () => {
    const glyph = glyphOfStrokes([
      [
        { x: 0, y: 4 },
        { x: 0, y: 3 },
      ],
      [
        { x: 2, y: 1 },
        { x: 2, y: 0 },
      ],
    ]);

    expect(glyph.map(key)).toEqual([
      "0,4",
      "0,3",
      "2,3 hop",
      "2,1 hop",
      "2,0",
      "0,0 hop",
      "0,4 hop",
    ]);
  });

  it("springt nicht, wo ein Strich dort beginnt, wo der vorige endet, und lässt Ecken auf der Linie weg", () => {
    const glyph = glyphOfStrokes([
      [
        { x: 1, y: 2 },
        { x: 1, y: 1 },
        { x: 1, y: 2 },
      ],
      [
        { x: 1, y: 2 },
        { x: 2, y: 2 },
      ],
      [
        { x: 2, y: 0 },
        { x: 3, y: 0 },
      ],
    ]);

    expect(glyph.map(key)).toEqual([
      "1,2",
      "1,1",
      "1,2",
      "2,2",
      "2,0 hop",
      "3,0",
      "1,0 hop",
      "1,2 hop",
    ]);
  });
});

describe("glyphOfStrokes mit leeren Strichen", () => {
  it("übergeht leere Striche", () => {
    expect(glyphOfStrokes([[], [{ x: 1, y: 1 }], []]).map(key)).toEqual(["1,1"]);
  });
});

describe("drawPicture", () => {
  it("zeichnet das Herz als einen Strich von der Spitze zurück zur Spitze", () => {
    const picture = drawPicture("heart", 21);

    expect(picture.width).toBe(21);
    expect(picture.height).toBe(heartHeightOf(21));
    expect(key(picture.glyph[0] ?? { x: -1, y: -1 })).toBe("10,18");
    expect(key(lastOf(picture.glyph))).toBe("10,18");
    expect(picture.glyph.filter((waypoint) => waypoint.marker !== undefined)).toEqual([]);
  });

  it("zeichnet den Smiley vom Kinn aus, springt zu den Augen und zuletzt zurück ans Kinn", () => {
    const picture = drawPicture("face_with_hand_over_mouth", 19);

    expect(picture.width).toBe(19);
    expect(picture.height).toBe(19);
    expect(key(picture.glyph[0] ?? { x: -1, y: -1 })).toBe("9,18");
    expect(key(lastOf(picture.glyph))).toBe("9,18 hop");
    expect(picture.glyph.filter((waypoint) => waypoint.marker === "hop").length).toBeGreaterThan(2);
  });

  it("kennt für jedes Bild die kleinste Größe, in der es noch zu erkennen ist", () => {
    expect(SMALLEST_SIZE).toEqual({ heart: 11, face_with_hand_over_mouth: 17 });
  });
});
