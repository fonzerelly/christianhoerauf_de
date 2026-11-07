import { describe, expect, it } from "vitest";
import { createDefaultFont } from "../font/font";
import { Mulberry32 } from "../random/mulberry32";
import type { Gate } from "../route/gate";
import { GLYPH_HEIGHT } from "../font/glyph";
import { layoutTextBlock } from "../route/text-block-layout";
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

function generate(lines: string[], seed = 1, entrance: Gate = ENTRANCE) {
  return createGenerator(seed).generate(lines, entrance);
}

describe("MazePageGenerator", () => {
  it("gibt Zeilen und Eingang unverändert an die Seite weiter", () => {
    const page = generate(["HALLO", "WELT"]);

    expect(page.lines).toEqual(["HALLO", "WELT"]);
    expect(page.entrance).toEqual(ENTRANCE);
  });

  // Laufrichtung „gerade“ (ADR 0007): links herein, rechts hinaus, auf Höhe der Schrift.
  it("legt den Ausgang rechts auf die Höhe der letzten Grundlinie", () => {
    const block = layoutTextBlock(["HALLO", "WELT"], COLUMNS, ROWS, SETTINGS.returnBandRows);

    for (let seed = 1; seed <= 5; seed++) {
      expect(generate(["HALLO", "WELT"], seed).exit).toEqual({
        cell: { x: COLUMNS - 1, y: block.bottom },
        side: "right",
      });
    }
  });

  it("legt ohne vorige Seite den Eingang links auf die Höhe der ersten Grundlinie", () => {
    const block = layoutTextBlock(["HALLO", "WELT"], COLUMNS, ROWS, SETTINGS.returnBandRows);

    expect(createGenerator(1).generate(["HALLO", "WELT"], undefined).entrance).toEqual({
      cell: { x: 0, y: block.top + GLYPH_HEIGHT },
      side: "left",
    });
  });

  it("setzt den Text links, mittig oder rechts", () => {
    const at = (alignment: "left" | "center" | "right") =>
      layoutTextBlock(["HALLO"], COLUMNS, ROWS, SETTINGS.returnBandRows, alignment).left;
    const firstLetter = (alignment: "left" | "center" | "right") =>
      Math.min(
        ...createGenerator(1)
          .generate(["HALLO"], ENTRANCE, alignment)
          .route.filter((step) => step.kind === "letter")
          .map((step) => step.x),
      );

    expect(createGenerator(1).generate(["HALLO"], ENTRANCE, "right").alignment).toBe("right");
    expect(firstLetter("left")).toBe(at("left"));
    expect(firstLetter("right")).toBe(at("right"));
    expect(firstLetter("center")).toBe(at("center"));
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

  describe("generatePath (Antwort ohne Stichwort)", () => {
    it("zieht ohne vorige Seite einen Pfad von links nach rechts auf halber Höhe", () => {
      const page = createGenerator(1).generatePath(undefined);
      const middle = Math.floor(ROWS / 2);

      expect(page.entrance).toEqual({ cell: { x: 0, y: middle }, side: "left" });
      expect(page.exit).toEqual({ cell: { x: COLUMNS - 1, y: middle }, side: "right" });
      expect(page.lines).toEqual([]);
      expect(page.route.every((step) => step.kind === "connector")).toBe(true);
    });

    it("bleibt auf der Höhe, auf der der Lichtpunkt hereinkommt", () => {
      const page = createGenerator(1).generatePath(ENTRANCE);

      expect(page.exit).toEqual({ cell: { x: COLUMNS - 1, y: 20 }, side: "right" });
    });

    it("geht auf halber Höhe hinaus, wenn er oben oder unten hereinkam (Bild oder Foto davor)", () => {
      const fromTop: Gate = { cell: { x: 5, y: 0 }, side: "top" };

      expect(createGenerator(1).generatePath(fromTop).exit).toEqual({
        cell: { x: COLUMNS - 1, y: Math.floor(ROWS / 2) },
        side: "right",
      });
    });

    it("erschließt jede Zelle", () => {
      expect(createGenerator(1).generatePath(ENTRANCE).grid.touchedCells()).toHaveLength(
        COLUMNS * ROWS,
      );
    });
  });
});
