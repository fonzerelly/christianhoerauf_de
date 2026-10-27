import { describe, expect, it } from "vitest";
import { createDefaultFont, REPLACEMENT_CHARACTER } from "../font/font";
import { MazeGrower } from "../maze/maze-grower";
import { PathFinder } from "../maze/path-finder";
import { WindingPathFinder } from "../maze/winding-path-finder";
import { Mulberry32 } from "../random/mulberry32";
import { AreaPathFinder } from "./area-path-finder";
import type { Gate } from "./gate";
import { LineChangePlanner } from "./line-change-planner";
import type { Picture } from "../picture/picture";
import { ROWS_BELOW_PICTURE, RouteBuilder } from "./route-builder";
import { layoutTextBlock } from "./text-block-layout";

const COLUMNS = 34;
const ROWS = 60;
const SETTINGS = { detour: 0.3, returnBandRows: 2, returnWindiness: 0.5 };
const ENTRANCE: Gate = { cell: { x: 0, y: 30 }, side: "left" };
const EXIT: Gate = { cell: { x: 33, y: 30 }, side: "right" };

function createBuilder(seed: number): RouteBuilder {
  const winding = new WindingPathFinder(new MazeGrower(new Mulberry32(seed)), new PathFinder());
  const areaPathFinder = new AreaPathFinder(COLUMNS, ROWS, winding);
  return new RouteBuilder(
    createDefaultFont(),
    areaPathFinder,
    new LineChangePlanner(areaPathFinder),
    SETTINGS,
  );
}

function build(lines: string[], seed = 1) {
  const block = layoutTextBlock(lines, COLUMNS, ROWS, SETTINGS.returnBandRows);
  return createBuilder(seed).build(lines, block, COLUMNS, ENTRANCE, EXIT);
}

/** Ein kleines Bild: ein Quadrat aus 3 × 3 Zellen, vom unteren Rand in der Mitte aus gezeichnet. */
const SQUARE: Picture = {
  width: 3,
  height: 3,
  glyph: [
    { x: 1, y: 2 },
    { x: 0, y: 2 },
    { x: 0, y: 0 },
    { x: 2, y: 0 },
    { x: 2, y: 2 },
    { x: 1, y: 2 },
  ],
};
const SQUARE_LEFT = 15;
const SQUARE_TOP = 20;

function buildSquare(seed = 1) {
  return createBuilder(seed).buildPicture(SQUARE, SQUARE_LEFT, SQUARE_TOP, COLUMNS, ENTRANCE, EXIT);
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

  describe("buildPicture", () => {
    it("beginnt vor dem Eingang, endet hinter dem Ausgang und geht nur zur Nachbarzelle", () => {
      for (const seed of [1, 2, 3]) {
        const { steps } = buildSquare(seed);

        expect(steps.slice(0, 3).map(key)).toEqual(["-2,30", "-1,30", "0,30"]);
        expect(steps.slice(-2).map(key)).toEqual(["34,30", "35,30"]);
        steps.slice(1).forEach((step, index) => {
          const before = steps[index] ?? step;
          expect(Math.abs(step.x - before.x) + Math.abs(step.y - before.y)).toBe(1);
        });
      }
    });

    it("kommt von unten senkrecht an den Anfang des Bilds und zeichnet es mit Schriftwegen", () => {
      const { steps } = buildSquare();
      const firstLetter = steps.findIndex(({ kind }) => kind === "letter");

      // Anfang des Quadrats: Spalte 15 + 1, Zeile 20 + 2. Darunter liegen die Zeilen für An- und Ablauf.
      expect(steps.slice(firstLetter - 1 - ROWS_BELOW_PICTURE, firstLetter).map(key)).toEqual([
        "16,25",
        "16,24",
        "16,23",
        "16,22",
      ]);
      expect(steps.filter(({ kind }) => kind === "letter").map(key)).toEqual([
        "15,22",
        "15,21",
        "15,20",
        "16,20",
        "17,20",
        "17,21",
        "17,22",
        "16,22",
      ]);
    });

    it("geht nach dem Bild eine Zelle hinunter und dann rechts hinaus", () => {
      const { steps, lastGlyphEnd } = buildSquare();

      expect(key(steps[lastGlyphEnd] ?? { x: 0, y: 0 })).toBe("16,22");
      expect(steps.slice(lastGlyphEnd + 1, lastGlyphEnd + 4).map(key)).toEqual([
        "16,23",
        "17,23",
        "18,23",
      ]);
    });
  });

  describe("buildPhoto", () => {
    /** Der Rahmen um ein Foto von 4 × 4 Zellen mit der linken oberen Ecke bei (11, 21). */
    const FRAME = { left: 10, right: 15, top: 20, bottom: 25 };

    function buildFrame(seed = 1) {
      return createBuilder(seed).buildPhoto(FRAME, 3, COLUMNS, ENTRANCE, EXIT);
    }

    /** Eine Runde auf dem Rahmen, links unten beginnend: hinauf, nach rechts, hinunter, zurück. */
    const LAP = [
      ...[24, 23, 22, 21, 20].map((y) => `10,${String(y)}`),
      ...[11, 12, 13, 14, 15].map((x) => `${String(x)},20`),
      ...[21, 22, 23, 24, 25].map((y) => `15,${String(y)}`),
      ...[14, 13, 12, 11, 10].map((x) => `${String(x)},25`),
    ];

    it("beginnt vor dem Eingang, endet hinter dem Ausgang und geht nur zur Nachbarzelle", () => {
      for (const seed of [1, 2, 3]) {
        const { steps } = buildFrame(seed);

        expect(steps.slice(0, 3).map(key)).toEqual(["-2,30", "-1,30", "0,30"]);
        expect(steps.slice(-2).map(key)).toEqual(["34,30", "35,30"]);
        steps.slice(1).forEach((step, index) => {
          const before = steps[index] ?? step;
          expect(Math.abs(step.x - before.x) + Math.abs(step.y - before.y)).toBe(1);
        });
      }
    });

    it("kommt von links in der untersten Zeile des Rahmens an und umrundet ihn dreimal mit Schriftwegen", () => {
      const { steps } = buildFrame();
      const firstLetter = steps.findIndex(({ kind }) => kind === "letter");

      expect(steps.slice(firstLetter - 3, firstLetter).map(key)).toEqual(["8,25", "9,25", "10,25"]);
      expect(steps.filter(({ kind }) => kind === "letter").map(key)).toEqual([
        ...LAP,
        ...LAP,
        ...LAP,
      ]);
    });

    it("merkt sich, wo jede Runde endet; die letzte ist das Ende der „Glyphe“", () => {
      const { steps, lapEnds, lastGlyphEnd } = buildFrame();
      const firstLetter = steps.findIndex(({ kind }) => kind === "letter");

      expect(lapEnds).toEqual([
        firstLetter + LAP.length - 1,
        firstLetter + 2 * LAP.length - 1,
        firstLetter + 3 * LAP.length - 1,
      ]);
      expect(lastGlyphEnd).toBe(lapEnds[2]);
    });

    it("geht nach der letzten Runde unten am Rahmen entlang nach rechts hinaus", () => {
      const { steps, lastGlyphEnd } = buildFrame();

      expect(steps.slice(lastGlyphEnd + 1, lastGlyphEnd + 8).map(key)).toEqual([
        "11,25",
        "12,25",
        "13,25",
        "14,25",
        "15,25",
        "16,25",
        "17,25",
      ]);
      expect(steps[lastGlyphEnd + 1]?.kind).toBe("connector");
    });
  });
});
