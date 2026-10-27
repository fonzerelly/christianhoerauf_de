import { describe, expect, it } from "vitest";
import { lastOf } from "../lists";
import type { Position } from "../maze/position";
import { faceWithHandOverMouth } from "./face-with-hand-over-mouth";

const key = ({ x, y }: Position): string => `${String(x)},${String(y)}`;
/** Ab 17 Zellen ist der Smiley erkennbar (siehe `SMALLEST_SIZE` in `picture.ts`). */
const SIZES = [17, 19, 21, 23, 31];

/** Wie oft der Weg nach oben läuft und gleich danach (nach einem waagrechten Stück) wieder nach unten. */
function countPeaks(path: readonly Position[]): number {
  let peaks = 0;
  let lastVertical = 0;
  path.slice(1).forEach((cell, index) => {
    const before = path[index] ?? cell;
    const vertical = Math.sign(cell.y - before.y);
    if (vertical === 0) return;
    if (lastVertical < 0 && vertical > 0) peaks++;
    lastVertical = vertical;
  });
  return peaks;
}

describe("faceWithHandOverMouth", () => {
  it("hat vier Striche: Gesicht, Hand, linkes und rechtes Auge", () => {
    expect(faceWithHandOverMouth(19).length).toBe(4);
  });

  it("beginnt das Gesicht am Kinn und kehrt dorthin zurück; die Hand wächst aus dem Kinn", () => {
    const [face = [], hand = []] = faceWithHandOverMouth(19);

    expect(key(face[0] ?? { x: -1, y: -1 })).toBe("9,18");
    expect(key(lastOf(face))).toBe("9,18");
    expect(key(hand[0] ?? { x: -1, y: -1 })).toBe("9,18");
    expect(key(lastOf(hand))).toBe("9,18");
  });

  it("geht in jedem Strich nur zur Nachbarzelle weiter und bleibt im Feld", () => {
    for (const size of SIZES) {
      for (const stroke of faceWithHandOverMouth(size)) {
        stroke.slice(1).forEach((cell, index) => {
          const before = stroke[index] ?? cell;
          expect(Math.abs(cell.x - before.x) + Math.abs(cell.y - before.y)).toBe(1);
        });
        for (const { x, y } of stroke) {
          expect(x).toBeGreaterThanOrEqual(0);
          expect(x).toBeLessThan(size);
          expect(y).toBeGreaterThanOrEqual(0);
          expect(y).toBeLessThan(size);
        }
      }
    }
  });

  it("hat ein rundes, spiegelgleiches Gesicht und gespiegelte Augen", () => {
    const [face = [], , leftEye = [], rightEye = []] = faceWithHandOverMouth(19);
    const mirror = ({ x, y }: Position): string => key({ x: 18 - x, y });

    expect(new Set(face.map(mirror))).toEqual(new Set(face.map(key)));
    expect(new Set(leftEye.map(mirror))).toEqual(new Set(rightEye.map(key)));
    expect(Math.min(...face.map((cell) => cell.x))).toBe(0);
    expect(Math.min(...face.map((cell) => cell.y))).toBe(0);
  });

  it("hat lachende Augen: Bögen, die nach oben gewölbt sind", () => {
    const [, , leftEye = []] = faceWithHandOverMouth(19);
    expect(leftEye.length).toBeGreaterThan(3);

    const ends = [leftEye[0], lastOf(leftEye)].map((cell) => cell?.y ?? -1);
    const top = Math.min(...leftEye.map((cell) => cell.y));
    expect(Math.min(...ends)).toBeGreaterThan(top);
  });

  it("hält die Hand mit vier Fingern und einem Daumen vor den Mund, ohne die Augen zu berühren", () => {
    for (const size of SIZES) {
      const [, hand = [], leftEye = [], rightEye = []] = faceWithHandOverMouth(size);
      const eyesBottom = Math.max(...[...leftEye, ...rightEye].map((cell) => cell.y));
      const handTop = Math.min(...hand.map((cell) => cell.y));

      expect(countPeaks(hand)).toBe(4);
      expect(Math.max(...hand.map((cell) => cell.x))).toBeGreaterThan(
        Math.max(...hand.slice(0, hand.length / 2).map((cell) => cell.x)),
      );
      expect(handTop - eyesBottom).toBeGreaterThanOrEqual(2);
    }
  });

  it("lässt zwischen Hand und Gesichtsrand Platz, außer am Handgelenk", () => {
    for (const size of SIZES) {
      const [face = [], hand = []] = faceWithHandOverMouth(size);
      const chinColumn = (size - 1) / 2;
      const touching = hand.filter(
        (cell) =>
          cell.x !== chinColumn &&
          face.some(
            (other) => Math.max(Math.abs(other.x - cell.x), Math.abs(other.y - cell.y)) <= 1,
          ),
      );

      expect(touching.map(key)).toEqual([]);
    }
  });
});
