// Golden Master Labyrinth: Der Neubau erzeugt bei gleichem Startwert, Raster und Text bitgenau
// dieselben Labyrinth-Seiten wie der Prototyp (Wände, Route, Eingang, Ausgang, Zeilen).
//
// Texte ohne "!" und Ersatzglyphe; die kennt der Prototyp nicht. Mehr Kombinationen prüft
// maze.property.test.ts.

import { describe, expect, it } from "vitest";
import type { MazeSettings } from "../../src/domain/pages/maze-page-generator";
import { pagesFromPrototype, pagesFromRewrite } from "./maze-pages";

const HANDY_SETTINGS: MazeSettings = {
  windiness: 0.7,
  detour: 0.3,
  returnBandRows: 2,
  returnWindiness: 0.5,
  maxWallRun: 4,
};

const GRIDS = [
  { columns: 34, rows: 70 },
  { columns: 34, rows: 60 },
  { columns: 60, rows: 34 },
  { columns: 10, rows: 10 },
  { columns: 25, rows: 40 },
];

const TEXTS = [
  "Hier ent|steht die Inter|net|prä|senz von Chris|tian Hör|auf",
  "HALLO FRAG MICH ETWAS",
  "Ich bin 8 Jahre alt?",
  "Das ist ein langer Platzhalter-Text zum Ausprobieren mehrerer Seiten",
  "X",
  "A.B.C-D 0123456789 ÄÖÜ",
];

describe("Golden Master Labyrinth", () => {
  it.each(GRIDS)(
    "erzeugt für Raster $columns x $rows dieselben Seiten wie der Prototyp",
    (grid) => {
      for (const seed of [1, 2, 3, 7, 42]) {
        for (const text of TEXTS) {
          const expected = pagesFromPrototype(text, grid, seed, HANDY_SETTINGS);

          const { pages } = pagesFromRewrite(text, grid, seed, HANDY_SETTINGS);

          expect(pages, `Startwert ${String(seed)}: ${text}`).toEqual(expected);
        }
      }
    },
  );

  it.each([
    { ...HANDY_SETTINGS, returnBandRows: 1 },
    { ...HANDY_SETTINGS, returnBandRows: 3, maxWallRun: 0 },
    { ...HANDY_SETTINGS, windiness: 0, detour: 0, returnWindiness: 0, maxWallRun: 1 },
    { ...HANDY_SETTINGS, windiness: 1, detour: 1, returnWindiness: 1, maxWallRun: 7 },
  ])("erzeugt auch mit den Einstellungen %j dieselben Seiten", (settings) => {
    for (const seed of [1, 5]) {
      for (const text of TEXTS) {
        const grid = { columns: 34, rows: 60 };

        expect(pagesFromRewrite(text, grid, seed, settings).pages).toEqual(
          pagesFromPrototype(text, grid, seed, settings),
        );
      }
    }
  });

  it("schließt eine neue Antwort an den Ausgang der vorigen an, wie der Prototyp", () => {
    const grid = { columns: 34, rows: 60 };
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const first = pagesFromPrototype(TEXTS[0] ?? "", grid, seed, HANDY_SETTINGS);
      const exitBefore = first[first.length - 1]?.exit;

      const expected = pagesFromPrototype("Hallo Welt", grid, seed + 1, HANDY_SETTINGS, exitBefore);

      expect(
        pagesFromRewrite("Hallo Welt", grid, seed + 1, HANDY_SETTINGS, exitBefore).pages,
      ).toEqual(expected);
    }
  });
});
