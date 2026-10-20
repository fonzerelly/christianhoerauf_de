// Experiment: Wie könnte die Ersatzglyphe aussehen, damit sie im Text nicht wie ein E wirkt?
//
// Vorgabe (Skizze docs/prototyp/ersatzglyphe.txt): ein Kamm. Der Lichtpunkt läuft einen
// senkrechten Rücken entlang und erkundet von dort jede Zeile als Sackgasse, auf demselben Weg
// hin und zurück.
//
// Zwei Arten von Bildern:
//  1. Echte Labyrinth-Seiten, erzeugt mit dem Generator aus src/ – nur für Varianten, die in das
//     Feld von 3 × 5 Zellen passen.
//  2. Skizzen nur aus der Leuchtspur, ohne Labyrinth – für Varianten, die der Generator heute
//     nicht kann: doppelt breit (7 × 5) und feinere Zellen (halber Zellabstand).
//
// Aufruf: experimente/ersatzglyphe/zeichne.sh. Ergebnis: experimente/ersatzglyphe/bilder/.

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Font, REPLACEMENT_CHARACTER } from "../../src/domain/font/font";
import { GLYPH_PATHS } from "../../src/domain/font/glyph-data";
import type { WaypointTuple } from "../../src/domain/font/glyph-data";
import { AnswerPaginator } from "../../src/domain/pages/answer-paginator";
import { Mulberry32 } from "../../src/domain/random/mulberry32";
import { TextNormalizer } from "../../src/domain/text/text-normalizer";
import { checkRoute } from "../../tests/structure/route-checks";
import { SETTINGS } from "../../tests/structure/soundness";
import { renderSvg } from "../../tests/structure/svg-diagram";

// Relativ zu frontend/; zeichne.sh wechselt dorthin.
const OUTPUT_DIR = "experimente/ersatzglyphe/bilder";

const SENTENCE = "Ein € ist kein E, und ein @ auch nicht";

/** Ein Punkt der Leuchtspur in Zellen; bei den Skizzen auch in halben Zellen. */
type Point = readonly [number, number];

interface Variant {
  readonly name: string;
  readonly title: string;
  readonly description: string;
  /** Breite des Felds in Zellen (Skizzen). */
  readonly width: number;
  readonly path: readonly Point[];
}

/** Kamm mit Rücken rechts: jede Zeile von rechts nach links und auf demselben Weg zurück. */
function combRight(width: number, height: number, step: number): Point[] {
  const right = width - 1;
  const bottom = height - 1;
  const points: Point[] = [[right, bottom]];
  for (let y = bottom; y >= 0; y -= step) {
    points.push([right, y], [0, y], [right, y]);
  }
  points.push([right, bottom]);
  return points;
}

/** Kamm mit Rücken in der Mitte: jede Zeile erst nach links, dann nach rechts, zurück zur Mitte. */
function combCenter(width: number, height: number, step: number): Point[] {
  const center = (width - 1) / 2;
  const right = width - 1;
  const bottom = height - 1;
  const points: Point[] = [[center, bottom]];
  for (let y = bottom; y >= 0; y -= step) {
    points.push([center, y], [0, y], [right, y], [center, y]);
  }
  points.push([center, bottom]);
  return points;
}

const CURRENT: Variant = {
  name: "aktuell",
  title: "Heute: Schlangenlinie",
  description: "Der heutige Weg durch alle 15 Zellen. Wirkt wie ein E.",
  width: 3,
  path: (GLYPH_PATHS[REPLACEMENT_CHARACTER] ?? []).map(([x, y]) => [x, y]),
};

const GRID_VARIANTS: readonly Variant[] = [
  CURRENT,
  {
    name: "kamm-rechts",
    title: "Kamm, Rücken rechts (deine Skizze)",
    description: "Rücken rechts, fünf Zinken nach links, jede hin und zurück.",
    width: 3,
    path: combRight(3, 5, 1),
  },
  {
    name: "kamm-mitte",
    title: "Kamm, Rücken in der Mitte",
    description: "Rücken in der Mitte, jede Zeile nach links und rechts erkundet.",
    width: 3,
    path: combCenter(3, 5, 1),
  },
];

const SKETCH_VARIANTS: readonly Variant[] = [
  ...GRID_VARIANTS,
  {
    name: "kamm-rechts-breit",
    title: "Kamm rechts, doppelt breit (7 × 5)",
    description: "Feld über zwei Zeichen samt Lücke, also 7 Zellen breit.",
    width: 7,
    path: combRight(7, 5, 1),
  },
  {
    name: "kamm-mitte-breit",
    title: "Kamm Mitte, doppelt breit (7 × 5)",
    description: "Wie oben, Rücken in der Mitte.",
    width: 7,
    path: combCenter(7, 5, 1),
  },
  {
    name: "kamm-rechts-fein",
    title: "Kamm rechts, feinere Zellen",
    description: "Halber Zellabstand im normalen Feld: neun Zinken statt fünf.",
    width: 3,
    path: combRight(3, 5, 0.5),
  },
  {
    name: "kamm-rechts-fein-breit",
    title: "Kamm rechts, feinere Zellen und doppelt breit",
    description: "Halber Zellabstand, Feld 7 Zellen breit.",
    width: 7,
    path: combRight(7, 5, 0.5),
  },
];

// ---------------------------------------------------------------------------------------------
// 1. Echte Labyrinth-Seiten

function fontWith(variant: Variant): Font {
  const path = variant.path.map(([x, y]): WaypointTuple => [x, y]);
  return new Font({ ...GLYPH_PATHS, [REPLACEMENT_CHARACTER]: path });
}

function mazePages(variant: Variant): string[] {
  const font = fontWith(variant);
  const paginator = new AnswerPaginator(
    font,
    new TextNormalizer(font, () => undefined),
    (seed) => new Mulberry32(seed),
    { columns: 34, rows: 60, restingDistance: 2, maze: SETTINGS },
  );
  const { pages } = paginator.paginate(SENTENCE, 1);
  return pages.map((page, index) => {
    const problems = checkRoute(page, SETTINGS.returnBandRows);
    if (problems.length > 0) {
      throw new Error(`${variant.name}, Seite ${String(index + 1)}: ${problems.join("; ")}`);
    }
    return renderSvg(page, 10);
  });
}

// ---------------------------------------------------------------------------------------------
// 2. Skizzen nur aus der Leuchtspur

const SKETCH_LINES = ["EIN █ IST", "KEIN E UND", "EIN █ AUCH", "NICHT"];
const SKETCH_CELL = 12;
const LINE_ADVANCE = 8;

function sketch(variant: Variant): string {
  const strokes: string[] = [];
  let widest = 0;
  SKETCH_LINES.forEach((line, lineIndex) => {
    let x = 0;
    for (const character of line) {
      const isReplacement = character === REPLACEMENT_CHARACTER;
      const width = isReplacement ? variant.width : 3;
      const path = isReplacement ? variant.path : glyphPoints(character);
      if (path.length > 0) strokes.push(polyline(path, x, lineIndex * LINE_ADVANCE));
      x += width + 1;
    }
    widest = Math.max(widest, x);
  });
  const width = (widest + 1) * SKETCH_CELL;
  const height = SKETCH_LINES.length * LINE_ADVANCE * SKETCH_CELL;
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${String(-SKETCH_CELL)} ${String(-SKETCH_CELL)} ${String(width)} ${String(height)}" width="${String(width)}" height="${String(height)}">`,
    `  <rect x="${String(-SKETCH_CELL)}" y="${String(-SKETCH_CELL)}" width="${String(width)}" height="${String(height)}" fill="#0b1a10"/>`,
    `  <g fill="none" stroke="#6dff8a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">`,
    ...strokes,
    "  </g>",
    "</svg>",
    "",
  ].join("\n");
}

function glyphPoints(character: string): Point[] {
  return (GLYPH_PATHS[character] ?? [])
    .filter(([, , marker]) => marker !== "dot")
    .map(([x, y]) => [x, y]);
}

function polyline(path: readonly Point[], offsetX: number, offsetY: number): string {
  const points = path
    .map(
      ([x, y]) => `${String((x + offsetX) * SKETCH_CELL)},${String((y + offsetY) * SKETCH_CELL)}`,
    )
    .join(" ");
  return `    <polyline points="${points}"/>`;
}

// ---------------------------------------------------------------------------------------------
// Übersichtsseite

function figure(file: string, caption: string): string {
  return `      <figure><img src="${file}" alt="${caption}"><figcaption>${caption}</figcaption></figure>`;
}

function main(): void {
  mkdirSync(OUTPUT_DIR, { recursive: true });

  const mazeFigures: string[] = [];
  for (const variant of GRID_VARIANTS) {
    mazePages(variant).forEach((svg, index) => {
      const file = `labyrinth-${variant.name}-seite-${String(index + 1)}.svg`;
      writeFileSync(join(OUTPUT_DIR, file), svg);
      mazeFigures.push(figure(file, `${variant.title}: ${variant.description}`));
    });
  }

  const sketchFigures = SKETCH_VARIANTS.map((variant) => {
    const file = `skizze-${variant.name}.svg`;
    writeFileSync(join(OUTPUT_DIR, file), sketch(variant));
    return figure(file, `${variant.title}: ${variant.description}`);
  });

  const html = `<!doctype html>
<html lang="de">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Ersatzglyphe: Varianten</title>
    <style>
      body { font-family: sans-serif; margin: 1rem; background: #fff; color: #222; }
      section { display: flex; flex-wrap: wrap; gap: 1.5rem; align-items: flex-start; }
      figure { margin: 0; max-width: 380px; }
      img { border: 1px solid #ddd; max-width: 100%; }
      figcaption { font-size: 0.85rem; }
    </style>
  </head>
  <body>
    <h1>Ersatzglyphe: Varianten</h1>
    <p>Satz: „${SENTENCE}“. € und @ kennt die Schrift nicht, sie werden zur Ersatzglyphe.</p>
    <h2>Echte Labyrinth-Seiten (Generator aus src/, Feld 3 × 5)</h2>
    <section>
${mazeFigures.join("\n")}
    </section>
    <h2>Skizzen: nur die Leuchtspur, ohne Labyrinth</h2>
    <p>Doppelt breit und feinere Zellen kann der Generator heute nicht; die Skizzen zeigen nur die Form.</p>
    <section>
${sketchFigures.join("\n")}
    </section>
  </body>
</html>
`;
  writeFileSync(join(OUTPUT_DIR, "index.html"), html);
  console.log(`Geschrieben: ${OUTPUT_DIR}/index.html`);
}

main();
