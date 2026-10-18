// Golden Master Labyrinth, breit gestreut: zufällige Startwerte, Raster, Texte und
// Einstellungen. Prototyp und Neubau müssen bitgenau dieselben Seiten liefern.

import fc from "fast-check";
import { describe, it } from "vitest";
import { expect } from "vitest";
import { pagesFromPrototype, pagesFromRewrite } from "./maze-pages";

const text = fc
  .array(fc.constantFrom(..."abcdefghijklmnopqrstuvwxyzäöüß0123456789-.?    ||".split("")), {
    minLength: 1,
    maxLength: 90,
  })
  .map((characters) => `A${characters.join("")}Z`);

const settings = fc.record({
  windiness: fc.double({ min: 0, max: 1, noNaN: true }),
  detour: fc.double({ min: 0, max: 1, noNaN: true }),
  returnBandRows: fc.integer({ min: 1, max: 4 }),
  returnWindiness: fc.double({ min: 0, max: 1, noNaN: true }),
  maxWallRun: fc.integer({ min: 0, max: 8 }),
});

const grid = fc.record({
  columns: fc.integer({ min: 9, max: 70 }),
  rows: fc.integer({ min: 9, max: 80 }),
});

describe("Golden Master Labyrinth (breit gestreut)", () => {
  it("erzeugt für beliebige Startwerte, Raster, Texte und Einstellungen dieselben Seiten", () => {
    fc.assert(
      fc.property(fc.nat(2 ** 31), grid, text, settings, (seed, size, answer, options) => {
        const expected = pagesFromPrototype(answer, size, seed, options);

        expect(pagesFromRewrite(answer, size, seed, options).pages).toEqual(expected);
      }),
      { numRuns: 400 },
    );
  });
});
