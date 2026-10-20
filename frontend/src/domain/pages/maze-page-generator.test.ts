import { describe, expect, it } from "vitest";
import { createDefaultFont } from "../font/font";
import { Mulberry32 } from "../random/mulberry32";
import type { Gate } from "../route/gate";
import { MazePageGenerator } from "./maze-page-generator";
import type { MazeSettings } from "./maze-page-generator";

const COLUMNS = 34;
const ROWS = 60;
const SETTINGS: MazeSettings = {
  windiness: 0.7,
  detour: 0.3,
  returnBandRows: 2,
  returnWindiness: 0.5,
  maxWallRun: 4,
};
const ENTRANCE: Gate = { cell: { x: 0, y: 20 }, side: "left" };

function createGenerator(seed: number): MazePageGenerator {
  return new MazePageGenerator(COLUMNS, ROWS, new Mulberry32(seed), createDefaultFont(), SETTINGS);
}

function generate(lines: string[], seed = 1, entrance = ENTRANCE) {
  return createGenerator(seed).generate(lines, entrance);
}

describe("MazePageGenerator", () => {
  it("gibt Zeilen und Eingang unverändert an die Seite weiter", () => {
    const page = generate(["HALLO", "WELT"]);

    expect(page.lines).toEqual(["HALLO", "WELT"]);
    expect(page.entrance).toEqual(ENTRANCE);
  });

  it("wählt einen Ausgang auf einem Rand des Rasters", () => {
    for (let seed = 1; seed <= 10; seed++) {
      const { exit } = generate(["HALLO"], seed);

      const onBorder =
        exit.cell.x === 0 ||
        exit.cell.x === COLUMNS - 1 ||
        exit.cell.y === 0 ||
        exit.cell.y === ROWS - 1;
      expect(onBorder).toBe(true);
      expect(["right", "top", "bottom"]).toContain(exit.side);
    }
  });

  it("erschließt jede Zelle des Rasters", () => {
    const page = generate(["HALLO", "WELT"]);

    expect(page.grid.touchedCells()).toHaveLength(COLUMNS * ROWS);
  });

  it("bricht jedes Wegstück der Route innerhalb des Rasters frei", () => {
    const { grid, route } = generate(["HALLO", "WELT"]);

    expect(route.length).toBeGreaterThan(50);
    route.slice(1).forEach((step, index) => {
      const before = route[index] ?? step;
      if (grid.contains(before.x, before.y) && grid.contains(step.x, step.y)) {
        expect(grid.isConnected(grid.idOf(before.x, before.y), grid.idOf(step.x, step.y))).toBe(
          true,
        );
      }
    });
  });

  it("nennt das Ende der letzten Glyphe als Index in der Route", () => {
    const { route, lastGlyphEnd } = generate(["HALLO"]);

    expect(route[lastGlyphEnd]?.kind).toBe("letter");
  });

  it("erzeugt mit demselben Startwert dieselbe Seite und mit einem anderen eine andere", () => {
    expect(generate(["HALLO"], 4)).toEqual(generate(["HALLO"], 4));
    expect(generate(["HALLO"], 4).route).not.toEqual(generate(["HALLO"], 5).route);
  });

  describe("in Stücken", () => {
    it("pausiert zweimal (nach der Route, nach den Wänden) und liefert dieselbe Seite wie `generate`", () => {
      const steps = createGenerator(3).generateInSteps(["HALLO", "WELT"], ENTRANCE);

      let pauses = 0;
      let step = steps.next();
      while (step.done !== true) {
        pauses++;
        step = steps.next();
      }

      expect(pauses).toBe(2);
      expect(step.value).toEqual(generate(["HALLO", "WELT"], 3));
    });
  });
});
