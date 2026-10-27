import { describe, expect, it } from "vitest";
import { createDefaultFont } from "../font/font";
import { Mulberry32 } from "../random/mulberry32";
import type { Gate } from "../route/gate";
import { MazePageGenerator } from "./maze-page-generator";
import type { MazeSettings } from "./maze-page-generator";
import { placePicture } from "./picture-layout";
import type { PlacedPicture } from "./picture-layout";
import type { PlacedPhoto } from "./photo-layout";

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

  describe("mit einem Bild", () => {
    function placedHeart(): PlacedPicture {
      const placed = placePicture("heart", COLUMNS, ROWS);
      if (placed === undefined) throw new Error("Das Herz passt nicht ins Testraster");
      return placed;
    }

    it("zeichnet das Bild statt eines Texts und erschließt jede Zelle", () => {
      const placed = placedHeart();
      const page = createGenerator(1).generatePicture(placed, ENTRANCE);
      const letters = page.route.filter(({ kind }) => kind === "letter");

      expect(page.lines).toEqual([]);
      expect(page.entrance).toEqual(ENTRANCE);
      expect(page.grid.touchedCells()).toHaveLength(COLUMNS * ROWS);
      expect(letters.length).toBeGreaterThan(40);
      for (const { x, y } of letters) {
        expect(x - placed.left).toBeGreaterThanOrEqual(0);
        expect(x - placed.left).toBeLessThan(placed.picture.width);
        expect(y - placed.top).toBeGreaterThanOrEqual(0);
        expect(y - placed.top).toBeLessThan(placed.picture.height);
      }
    });

    it("bricht die Route frei und nennt die Spitze als Ende des Bilds", () => {
      const placed = placedHeart();
      const { grid, route, lastGlyphEnd } = createGenerator(2).generatePicture(placed, ENTRANCE);

      route.slice(1).forEach((step, index) => {
        const before = route[index] ?? step;
        if (grid.contains(before.x, before.y) && grid.contains(step.x, step.y)) {
          expect(grid.isConnected(grid.idOf(before.x, before.y), grid.idOf(step.x, step.y))).toBe(
            true,
          );
        }
      });
      expect(route[lastGlyphEnd]?.y).toBe(placed.top + placed.picture.height - 1);
    });

    it("pausiert in Stücken ebenfalls zweimal und liefert dieselbe Seite", () => {
      const steps = createGenerator(3).generatePictureInSteps(placedHeart(), ENTRANCE);

      let pauses = 0;
      let step = steps.next();
      while (step.done !== true) {
        pauses++;
        step = steps.next();
      }

      expect(pauses).toBe(2);
      expect(step.value).toEqual(createGenerator(3).generatePicture(placedHeart(), ENTRANCE));
    });
  });

  describe("mit einem Foto", () => {
    const PLACED: PlacedPhoto = { photo: "chris", left: 11, top: 21, size: 8 };

    /** Liegt die Zelle auf dem Foto? */
    function isOnPhoto(x: number, y: number): boolean {
      return x >= 11 && x < 19 && y >= 21 && y < 29;
    }

    it("legt das Foto auf die Seite, umrundet es dreimal und erschließt jede Zelle", () => {
      const page = createGenerator(1).generatePhoto(PLACED, ENTRANCE);

      expect(page.lines).toEqual([]);
      expect(page.entrance).toEqual(ENTRANCE);
      expect(page.photo).toEqual({ ...PLACED, lapEnds: page.photo?.lapEnds });
      expect(page.photo?.lapEnds).toHaveLength(3);
      expect(page.lastGlyphEnd).toBe(page.photo?.lapEnds[2]);
      expect(page.grid.touchedCells()).toHaveLength(COLUMNS * ROWS);
    });

    it("macht das Feld unter dem Foto zu einem Raum ohne Wände, der zum Rahmen hin geschlossen ist", () => {
      const { grid } = createGenerator(2).generatePhoto(PLACED, ENTRANCE);

      for (let y = 20; y <= 29; y++) {
        for (let x = 10; x <= 19; x++) {
          const right = grid.isConnected(grid.idOf(x, y), grid.idOf(x + 1, y));
          const down = grid.isConnected(grid.idOf(x, y), grid.idOf(x, y + 1));
          if (isOnPhoto(x, y) && isOnPhoto(x + 1, y)) expect(right).toBe(true);
          if (isOnPhoto(x, y) !== isOnPhoto(x + 1, y)) expect(right).toBe(false);
          if (isOnPhoto(x, y) && isOnPhoto(x, y + 1)) expect(down).toBe(true);
          if (isOnPhoto(x, y) !== isOnPhoto(x, y + 1)) expect(down).toBe(false);
        }
      }
    });

    it("bricht die Route frei, und sie betritt das Foto nie", () => {
      const { grid, route } = createGenerator(3).generatePhoto(PLACED, ENTRANCE);

      route.slice(1).forEach((step, index) => {
        const before = route[index] ?? step;
        expect(isOnPhoto(step.x, step.y)).toBe(false);
        if (grid.contains(before.x, before.y) && grid.contains(step.x, step.y)) {
          expect(grid.isConnected(grid.idOf(before.x, before.y), grid.idOf(step.x, step.y))).toBe(
            true,
          );
        }
      });
    });

    it("pausiert in Stücken ebenfalls zweimal und liefert dieselbe Seite", () => {
      const steps = createGenerator(4).generatePhotoInSteps(PLACED, ENTRANCE);

      let pauses = 0;
      let step = steps.next();
      while (step.done !== true) {
        pauses++;
        step = steps.next();
      }

      expect(pauses).toBe(2);
      expect(step.value).toEqual(createGenerator(4).generatePhoto(PLACED, ENTRANCE));
    });
  });
});
