// Schaubilder der Labyrinth-Seiten als Datei-Snapshots (SVG): Wände dünn, Route rot. Eine Datei
// je Zeichen, dazu einige Sätze und eine Übersichtsseite (schaubilder/index.html).
//
// Ändert sich der Algorithmus, zeigt der Vergleich der Dateien (git diff), was sich im Bild
// geändert hat. Neue Fassungen entstehen mit `npm run test:unit -- -u`.

import { describe, expect, it } from "vitest";
import { createDefaultFont } from "../../src/domain/font/font";
import { AnswerPaginator } from "../../src/domain/pages/answer-paginator";
import { MazePageGenerator } from "../../src/domain/pages/maze-page-generator";
import type { MazePage } from "../../src/domain/pages/maze-page-generator";
import { Mulberry32 } from "../../src/domain/random/mulberry32";
import type { Gate } from "../../src/domain/route/gate";
import { TextNormalizer } from "../../src/domain/text/text-normalizer";
import { SETTINGS } from "./soundness";
import { renderSvg } from "./svg-diagram";

const CELL_SIZE = 10;

/** Zeichen und der Name der Datei, in der ihr Bild liegt. */
const CHARACTERS: [string, string][] = [
  ...Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZ").map((c): [string, string] => [c, c]),
  ["Ä", "Ae"],
  ["Ö", "Oe"],
  ["Ü", "Ue"],
  ...Array.from("0123456789").map((c): [string, string] => [c, c]),
  ["-", "bindestrich"],
  [".", "punkt"],
  ["?", "fragezeichen"],
  ["!", "ausrufezeichen"],
  ["█", "ersatzglyphe"],
];

const SENTENCES: [string, string][] = [
  ["Hallo, ich bin ein Prototyp", "hallo-prototyp"],
  ["Hier ent|steht die Inter|net|prä|senz von Chris|tian Hör|auf", "internetpraesenz"],
  ["A.B.C-D 0123456789 ÄÖÜ ?!", "zeichen-gemischt"],
  ["Das ist ein langer Platzhalter-Text zum Ausprobieren mehrerer Seiten", "mehrere-seiten"],
];

const GRID_OF_SENTENCES = { columns: 34, rows: 60 };
const GRID_OF_CHARACTERS = { columns: 14, rows: 16 };

function characterPage(character: string): MazePage {
  const { columns, rows } = GRID_OF_CHARACTERS;
  const generator = new MazePageGenerator(
    columns,
    rows,
    new Mulberry32(1),
    createDefaultFont(),
    SETTINGS,
  );
  const entrance: Gate = { cell: { x: 0, y: 8 }, side: "left" };
  return generator.generate([character], entrance);
}

function sentencePages(sentence: string): readonly MazePage[] {
  const font = createDefaultFont();
  const paginator = new AnswerPaginator(
    font,
    new TextNormalizer(font, () => undefined),
    (seed) => new Mulberry32(seed),
    { ...GRID_OF_SENTENCES, restingDistance: 2, maze: SETTINGS },
  );
  return paginator.paginate(sentence, 1).pages;
}

describe("Schaubilder", () => {
  it.each(CHARACTERS)("zeigt das Zeichen %s (zeichen-%s.svg)", async (character, name) => {
    await expect(renderSvg(characterPage(character), CELL_SIZE)).toMatchFileSnapshot(
      `./schaubilder/zeichen-${name}.svg`,
    );
  });

  it.each(SENTENCES)("zeigt den Satz %j (satz-%s-seite-N.svg)", async (sentence, name) => {
    const pages = sentencePages(sentence);
    expect(pages.length).toBeGreaterThan(0);
    for (const [index, page] of pages.entries()) {
      await expect(renderSvg(page, CELL_SIZE)).toMatchFileSnapshot(
        `./schaubilder/satz-${name}-seite-${String(index + 1)}.svg`,
      );
    }
  });

  it("fasst alle Bilder auf einer Übersichtsseite zusammen", async () => {
    const characterCells = CHARACTERS.map(
      ([character, name]) =>
        `      <figure><img src="zeichen-${name}.svg" alt="Zeichen ${character}"><figcaption>${character}</figcaption></figure>`,
    );
    const sentenceCells = SENTENCES.flatMap(([sentence, name]) =>
      sentencePages(sentence).map(
        (_, index) =>
          `      <figure><img src="satz-${name}-seite-${String(index + 1)}.svg" alt="Satz ${name}, Seite ${String(index + 1)}"><figcaption>${sentence.replaceAll("|", "")} (Seite ${String(index + 1)})</figcaption></figure>`,
      ),
    );

    const html = `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Schaubilder der Labyrinth-Seiten</title>
    <style>
      body { font-family: sans-serif; margin: 1rem; background: #fff; color: #222; }
      section { display: flex; flex-wrap: wrap; gap: 1rem; }
      figure { margin: 0; }
      img { background: #fafafa; border: 1px solid #ddd; max-width: 100%; }
      figcaption { text-align: center; font-size: 0.85rem; }
    </style>
  </head>
  <body>
    <h1>Schaubilder der Labyrinth-Seiten</h1>
    <p>Wände dünn grau, Route rot (dick: Schriftweg, blass: Verbindungsweg, gestrichelt: Sprung).</p>
    <h2>Zeichen</h2>
    <section>
${characterCells.join("\n")}
    </section>
    <h2>Sätze</h2>
    <section>
${sentenceCells.join("\n")}
    </section>
  </body>
</html>
`;

    await expect(html).toMatchFileSnapshot("./schaubilder/index.html");
  });
});
