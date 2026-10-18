// Prüft die Labyrinth-Seiten von außen: Der Leser liest den Text aus der Route zurück, und die
// Route hält die Regeln ein (lückenlos, nie durch eine Wand, kreuzt sich nicht, jede Zelle
// erreichbar, Eingang gegenüber dem vorigen Ausgang).

import { describe, expect, it } from "vitest";
import { createDefaultFont } from "../../src/domain/font/font";
import { AnswerPaginator } from "../../src/domain/pages/answer-paginator";
import { MazePageGenerator } from "../../src/domain/pages/maze-page-generator";
import type { MazePage } from "../../src/domain/pages/maze-page-generator";
import { Mulberry32 } from "../../src/domain/random/mulberry32";
import type { Gate } from "../../src/domain/route/gate";
import { TextNormalizer } from "../../src/domain/text/text-normalizer";
import { checkPageSequence } from "./route-checks";
import { expectPageIsSound, SETTINGS } from "./soundness";

const CHARACTERS = Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ0123456789-.?!█");

/** Ein Raster, in das ein einzelnes Zeichen gerade passt (mit Platz für An- und Ablauf). */
const SINGLE_CHARACTER_GRID = { columns: 14, rows: 16 };

function singleCharacterPage(character: string, seed: number): MazePage {
  const { columns, rows } = SINGLE_CHARACTER_GRID;
  const generator = new MazePageGenerator(
    columns,
    rows,
    new Mulberry32(seed),
    createDefaultFont(),
    SETTINGS,
  );
  const entrance: Gate = { cell: { x: 0, y: 8 }, side: "left" };
  return generator.generate([character], entrance);
}

describe("Struktur der Labyrinth-Seiten", () => {
  it.each(CHARACTERS)("lässt sich für das Zeichen %s aus der Route zurücklesen", (character) => {
    for (let seed = 1; seed <= 6; seed++) {
      expectPageIsSound(singleCharacterPage(character, seed));
    }
  });

  it.each([
    "Hallo, ich bin ein Prototyp",
    "Hier ent|steht die Inter|net|prä|senz von Chris|tian Hör|auf",
    "Das ist ein langer Platzhalter-Text zum Ausprobieren mehrerer Seiten",
    "A.B.C-D 0123456789 ÄÖÜ ?!",
    "Fünf €uro für 日本",
  ])("lässt sich für den Satz %j über alle Seiten zurücklesen", (sentence) => {
    const font = createDefaultFont();
    const normalizer = new TextNormalizer(font, () => undefined);
    const grids = [
      { columns: 34, rows: 60, seed: 1 },
      { columns: 34, rows: 60, seed: 2 },
      { columns: 60, rows: 34, seed: 3 },
    ];

    for (const { columns, rows, seed } of grids) {
      const paginator = new AnswerPaginator(
        font,
        normalizer,
        (startValue) => new Mulberry32(startValue),
        {
          columns,
          rows,
          restingDistance: 2,
          maze: SETTINGS,
        },
      );

      const { pages } = paginator.paginate(sentence, seed);

      pages.forEach(expectPageIsSound);
      expect(checkPageSequence(pages)).toEqual([]);
    }
  });
});
