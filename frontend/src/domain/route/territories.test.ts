import { describe, expect, it } from "vitest";
import type { Gate } from "./gate";
import { Territories } from "./territories";

const COLUMNS = 34;
const BLOCK = { left: 13, right: 19, top: 23, bottom: 36 };
const entranceLeft: Gate = { cell: { x: 0, y: 30 }, side: "left" };
const exitRight: Gate = { cell: { x: 33, y: 30 }, side: "right" };

/** Zu welchem Revier gehört die Zelle? */
function territoryOf(territories: Territories, x: number, y: number): string {
  const owners = [
    territories.isText({ x, y }) ? "text" : "",
    territories.isApproach({ x, y }) ? "approach" : "",
    territories.isLeave({ x, y }) ? "leave" : "",
  ].filter((owner) => owner !== "");
  return owners.join("+");
}

describe("Territories", () => {
  const territories = new Territories(BLOCK, COLUMNS, entranceLeft, exitRight);

  it("rechnet zum Text-Revier den Textblock plus je eine Spalte Rand", () => {
    expect(territoryOf(territories, 13, 30)).toBe("text");
    expect(territoryOf(territories, 12, 23)).toBe("text");
    expect(territoryOf(territories, 20, 36)).toBe("text");
    expect(territoryOf(territories, 11, 30)).toBe("approach");
    expect(territoryOf(territories, 21, 30)).toBe("leave");
  });

  it("teilt die Streifen über und unter dem Text in der Mitte", () => {
    expect(territoryOf(territories, 16, 5)).toBe("approach");
    expect(territoryOf(territories, 17, 5)).toBe("leave");
    expect(territoryOf(territories, 16, 50)).toBe("approach");
    expect(territoryOf(territories, 17, 50)).toBe("leave");
  });

  it("gibt links neben dem Text dem Anlauf und rechts dem Ablauf den Platz", () => {
    expect(territoryOf(territories, 0, 30)).toBe("approach");
    expect(territoryOf(territories, 33, 30)).toBe("leave");
  });

  it("gehört jede Zelle genau einem Revier", () => {
    for (let y = 0; y < 60; y++) {
      for (let x = 0; x < COLUMNS; x++) {
        expect(["text", "approach", "leave"]).toContain(territoryOf(territories, x, y));
      }
    }
  });

  it("verschiebt die Trennung rechts vom Eingang, wenn dieser oben liegt", () => {
    const entranceTop: Gate = { cell: { x: 20, y: 0 }, side: "top" };
    const shifted = new Territories(BLOCK, COLUMNS, entranceTop, exitRight);

    expect(territoryOf(shifted, 20, 5)).toBe("approach");
    expect(territoryOf(shifted, 21, 5)).toBe("leave");
    expect(territoryOf(shifted, 17, 50)).toBe("leave");
  });

  it("verschiebt die Trennung links vom Ausgang, wenn dieser oben liegt", () => {
    const exitTop: Gate = { cell: { x: 10, y: 0 }, side: "top" };
    const shifted = new Territories(BLOCK, COLUMNS, entranceLeft, exitTop);

    expect(territoryOf(shifted, 9, 5)).toBe("approach");
    expect(territoryOf(shifted, 10, 5)).toBe("leave");
  });

  it("verschiebt die Trennung unten, wenn Eingang und Ausgang dort liegen", () => {
    const entranceBottom: Gate = { cell: { x: 20, y: 59 }, side: "bottom" };
    const exitBottom: Gate = { cell: { x: 30, y: 59 }, side: "bottom" };
    const shifted = new Territories(BLOCK, COLUMNS, entranceBottom, exitBottom);

    expect(territoryOf(shifted, 20, 50)).toBe("approach");
    expect(territoryOf(shifted, 21, 50)).toBe("leave");
  });
});
