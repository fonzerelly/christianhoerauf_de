import { describe, expect, it } from "vitest";
import { createDefaultFont, REPLACEMENT_CHARACTER } from "../font/font";
import { MazeGrower } from "../maze/maze-grower";
import { PathFinder } from "../maze/path-finder";
import { WindingPathFinder } from "../maze/winding-path-finder";
import { Mulberry32 } from "../random/mulberry32";
import { AreaPathFinder } from "./area-path-finder";
import type { Gate } from "./gate";
import { LineChangePlanner } from "./line-change-planner";
import { RouteBuilder } from "./route-builder";
import { layoutTextBlock } from "./text-block-layout";

const COLUMNS = 34;
const ROWS = 60;
const SETTINGS = { detour: 0.3, returnBandRows: 2, returnWindiness: 0.5 };
const ENTRANCE: Gate = { cell: { x: 0, y: 30 }, side: "left" };
const EXIT: Gate = { cell: { x: 33, y: 30 }, side: "right" };

function build(lines: string[], seed = 1) {
  const winding = new WindingPathFinder(new MazeGrower(new Mulberry32(seed)), new PathFinder());
  const areaPathFinder = new AreaPathFinder(COLUMNS, ROWS, winding);
  const builder = new RouteBuilder(
    createDefaultFont(),
    areaPathFinder,
    new LineChangePlanner(areaPathFinder),
    SETTINGS,
  );
  const block = layoutTextBlock(lines, COLUMNS, ROWS, SETTINGS.returnBandRows);
  return builder.build(lines, block, COLUMNS, ENTRANCE, EXIT);
}

const key = ({ x, y }: { x: number; y: number }): string => `${String(x)},${String(y)}`;

describe("RouteBuilder", () => {
  it("beginnt zwei Zellen vor dem Eingang und endet zwei Zellen hinter dem Ausgang", () => {
    const { steps } = build(["L"]);

    expect(steps.slice(0, 3).map(key)).toEqual(["-2,30", "-1,30", "0,30"]);
    expect(steps.slice(-2).map(key)).toEqual(["34,30", "35,30"]);
  });

  it("macht nur Schritte zur Nachbarzelle und bleibt zwischen den Außenschritten im Raster", () => {
    for (const lines of [["L"], ["AB", "CD"], ["HALLO", "WELT", "?"]]) {
      const { steps } = build(lines);

      steps.slice(1).forEach((step, index) => {
        const before = steps[index] ?? step;
        expect(Math.abs(step.x - before.x) + Math.abs(step.y - before.y)).toBe(1);
      });
      for (const step of steps.slice(2, -2)) {
        expect(step.x).toBeGreaterThanOrEqual(0);
        expect(step.x).toBeLessThan(COLUMNS);
        expect(step.y).toBeGreaterThanOrEqual(0);
        expect(step.y).toBeLessThan(ROWS);
      }
    }
  });

  it("schreibt das L mit Schriftwegen an die Stelle, an der der Textblock liegt", () => {
    const { steps } = build(["L"]);

    // Das Feld der Glyphe belegt Spalten 15 bis 17 und Zeilen 27 bis 31, die Grundlinie ist Zeile 32.
    const letterCells = steps.filter(({ kind }) => kind === "letter").map(key);
    expect(letterCells).toEqual([
      "15,30",
      "15,29",
      "15,28",
      "15,27",
      "15,28",
      "15,29",
      "15,30",
      "15,31",
      "16,31",
      "17,31",
    ]);
  });

  it("rückt nach einer Ersatzglyphe um deren doppelte Breite weiter", () => {
    const { steps } = build([`${REPLACEMENT_CHARACTER}A`]);

    // Die Zeile ist 11 Zellen breit und beginnt in Spalte 11. Die Ersatzglyphe belegt die Spalten 11
    // bis 17, dann kommt eine Lücke, das A beginnt in Spalte 19.
    const letterColumns = new Set(steps.filter(({ kind }) => kind === "letter").map(({ x }) => x));
    expect([...letterColumns].sort((a, b) => a - b)).toEqual([
      11, 12, 13, 14, 15, 16, 17, 19, 20, 21,
    ]);
  });

  it("nennt als Ende der letzten Glyphe das letzte Wegstück in ihrem Feld", () => {
    const { steps, lastGlyphEnd } = build(["L"]);

    expect(key(steps[lastGlyphEnd] ?? { x: 0, y: 0 })).toBe("17,31");
  });

  it("nennt als Ende der letzten Glyphe das Ende der letzten Zeile, auch bei mehreren Zeilen", () => {
    const { steps, lastGlyphEnd } = build(["AB", "L"]);

    const end = steps[lastGlyphEnd] ?? { x: 0, y: 0, kind: "letter", isDot: false };
    // Zwei Zeilen belegen 14 Rasterzeilen ab Zeile 23; das Feld der zweiten beginnt 8 tiefer.
    expect(end.y).toBe(23 + 8 + 4);
    expect(end.kind).toBe("letter");
  });

  it("überspringt Leerzeichen, ohne einen Fehler zu machen", () => {
    const { steps, lastGlyphEnd } = build(["L L"]);

    expect(steps.filter(({ kind }) => kind === "letter")).toHaveLength(20);
    expect(lastGlyphEnd).toBeGreaterThan(0);
  });

  it("hinterlässt beim Punkt genau einen Punkt und läuft Sprünge ohne Leuchtspur", () => {
    const { steps } = build(["A.", "B"]);

    expect(steps.filter(({ isDot }) => isDot)).toHaveLength(1);
    expect(steps.some(({ kind }) => kind === "silent")).toBe(true);
  });

  it("wirft, wenn die Zeilen keine einzige Glyphe enthalten", () => {
    expect(() => build([" "])).toThrow("kein darstellbares Zeichen");
  });
});
