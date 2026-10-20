// Strukturtests, breit gestreut: beliebige Startwerte, Raster und Texte (auch mit unbekannten
// Zeichen). Jede erzeugte Seite muss sich zurücklesen lassen und die Regeln der Route einhalten.

import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { lastOf } from "../../src/domain/lists";
import { createDefaultFont } from "../../src/domain/font/font";
import { AnswerPaginator } from "../../src/domain/pages/answer-paginator";
import { Mulberry32 } from "../../src/domain/random/mulberry32";
import { TextNormalizer } from "../../src/domain/text/text-normalizer";
import { checkPageSequence } from "./route-checks";
import { expectPageIsSound, SETTINGS } from "./soundness";

const answer = fc
  .array(
    fc.constantFrom(...Array.from("abcdefghijklmnopqrstuvwxyzäöüßé0123456789-.?!,:;    ||€日")),
    {
      minLength: 1,
      maxLength: 120,
    },
  )
  .map((characters) => characters.join(""));

// Mindestens 13 Spalten: Erst dann passen zwei Zeichenbreiten in eine Zeile, und die breite
// Ersatzglyphe (7 Zellen) hat Platz. In einem schmaleren Raster läuft sie über den Rand hinaus.
const grid = fc.record({
  columns: fc.integer({ min: 13, max: 70 }),
  rows: fc.integer({ min: 10, max: 80 }),
});

describe("Struktur der Labyrinth-Seiten (breit gestreut)", () => {
  it("lässt jede Seite jeder Antwort zurücklesen, mit Haltepunkt im Raster", () => {
    const font = createDefaultFont();
    const normalizer = new TextNormalizer(font, () => undefined);

    fc.assert(
      fc.property(fc.nat(2 ** 31), grid, answer, (seed, size, text) => {
        const paginator = new AnswerPaginator(font, normalizer, (start) => new Mulberry32(start), {
          ...size,
          restingDistance: 2,
          maze: SETTINGS,
        });

        const { pages, restingStepIndex } = paginator.paginate(text, seed);

        pages.forEach(expectPageIsSound);
        expect(checkPageSequence(pages)).toEqual([]);
        const lastPage = lastOf(pages);
        const restingStep = lastPage.route[restingStepIndex];
        expect(restingStep).toBeDefined();
        expect(lastPage.grid.contains(restingStep?.x ?? -1, restingStep?.y ?? -1)).toBe(true);
      }),
      { numRuns: 300 },
    );
  });
});
