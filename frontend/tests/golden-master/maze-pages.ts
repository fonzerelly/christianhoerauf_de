// Gemeinsame Hilfen für den Golden Master der Labyrinth-Seiten: erzeugt Seiten mit dem Prototyp
// und mit dem Neubau und bringt beide in dieselbe Form, damit sie sich mit toEqual vergleichen
// lassen.

import { createDefaultFont } from "../../src/domain/font/font";
import type { MazePage } from "../../src/domain/pages/maze-page-generator";
import type { MazeSettings } from "../../src/domain/pages/maze-page-generator";
import { AnswerPaginator } from "../../src/domain/pages/answer-paginator";
import { Mulberry32 } from "../../src/domain/random/mulberry32";
import type { Gate } from "../../src/domain/route/gate";
import { TextNormalizer } from "../../src/domain/text/text-normalizer";
import { loadPrototype } from "./prototype";

const prototype = loadPrototype();

/** Die Seite so, wie der Prototyp sie als JSON liefert. */
export interface PrototypePage {
  maze: {
    cols: number;
    rows: number;
    openRight: boolean[][];
    openDown: boolean[][];
    visited: boolean[][];
  };
  route: { x: number; y: number; kind: string; isDot?: true }[];
  entrance: Gate;
  exit: Gate;
  lines: string[];
}

export interface GridSize {
  readonly columns: number;
  readonly rows: number;
}

/** Die Seiten einer Antwort, erzeugt vom Prototyp (Rand und Seitenzahl beliebig). */
export function pagesFromPrototype(
  text: string,
  grid: GridSize,
  seed: number,
  settings: MazeSettings,
  exitBefore?: Gate,
): PrototypePage[] {
  const options = {
    windiness: settings.windiness,
    detour: settings.detour,
    entranceSide: "random",
    exitSide: "random",
    maxLinesPerPage: 1000, // im Neubau entfallen; hier darf die Obergrenze nie greifen
    returnBandRows: settings.returnBandRows,
    returnWindiness: settings.returnWindiness,
    maxWallRun: settings.maxWallRun,
  };
  return prototype.call<PrototypePage[]>(
    "generateMessagePages",
    text,
    grid.columns,
    grid.rows,
    seed,
    options,
    exitBefore,
  );
}

/** Die Seiten einer Antwort, erzeugt vom Neubau, in der Form des Prototyps. */
export function pagesFromRewrite(
  text: string,
  grid: GridSize,
  seed: number,
  settings: MazeSettings,
  exitBefore?: Gate,
): { pages: PrototypePage[]; restingStepIndex: number } {
  const font = createDefaultFont();
  const paginator = new AnswerPaginator(
    font,
    new TextNormalizer(font, () => undefined),
    (startValue) => new Mulberry32(startValue),
    { ...grid, restingDistance: 2, maze: settings },
  );
  const answer = paginator.paginate(text, seed, exitBefore);
  return { pages: answer.pages.map(inPrototypeShape), restingStepIndex: answer.restingStepIndex };
}

function inPrototypeShape(page: MazePage): PrototypePage {
  const { grid } = page;
  const matrix = (isTrue: (x: number, y: number) => boolean): boolean[][] =>
    Array.from({ length: grid.rows }, (_, y) =>
      Array.from({ length: grid.columns }, (__, x) => isTrue(x, y)),
    );
  return {
    maze: {
      cols: grid.columns,
      rows: grid.rows,
      openRight: matrix((x, y) => grid.isOpenRight(x, y)),
      openDown: matrix((x, y) => grid.isOpenDown(x, y)),
      visited: matrix((x, y) => grid.isTouched(grid.idOf(x, y))),
    },
    route: page.route.map(({ x, y, kind, isDot }) =>
      isDot ? { x, y, kind, isDot } : { x, y, kind },
    ),
    entrance: page.entrance,
    exit: page.exit,
    lines: [...page.lines],
  };
}
