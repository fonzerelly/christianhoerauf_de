import type { Font } from "../font/font";
import { lastOf } from "../lists";
import type { RandomSource } from "../random/random-source";
import { BorderCellPicker } from "../route/border-cell-picker";
import { entranceOppositeOf } from "../route/gate";
import type { Gate } from "../route/gate";
import { LineWrapper } from "../text/line-wrapper";
import type { TextNormalizer } from "../text/text-normalizer";
import { MazePageGenerator } from "./maze-page-generator";
import type { MazePage, MazeSettings } from "./maze-page-generator";
import { textCapacityOf } from "./text-capacity";

export interface PaginatorSettings {
  /** Breite des Rasters einer Labyrinth-Seite in Zellen. */
  readonly columns: number;
  /** Höhe des Rasters in Zellen. */
  readonly rows: number;
  /** Wie viele Wegstücke hinter der letzten Glyphe der Haltepunkt liegt. */
  readonly restingDistance: number;
  readonly maze: MazeSettings;
}

/** Die Labyrinth-Seiten einer Antwort und wo der Lichtpunkt danach wartet. */
export interface PaginatedAnswer {
  readonly pages: readonly MazePage[];
  /** Index des Wegstücks in der Route der letzten Seite, an dem der Lichtpunkt wartet (Haltepunkt). */
  readonly restingStepIndex: number;
}

/** Macht aus einer Antwort die Folge ihrer Labyrinth-Seiten. */
export class AnswerPaginator {
  public constructor(
    private readonly font: Font,
    private readonly normalizer: TextNormalizer,
    private readonly createRandom: (seed: number) => RandomSource,
    private readonly settings: PaginatorSettings,
  ) {}

  /**
   * Bereitet die Antwort auf, bricht sie um und erzeugt für die Zeilen so viele Seiten, wie sie
   * braucht. Aller Zufall folgt aus `seed`.
   *
   * Jede Folgeseite beginnt dort, wo die vorige aufgehört hat: Ihr Eingang liegt dem Ausgang der
   * vorigen genau gegenüber. Dasselbe gilt für die erste Seite einer Antwort, wenn `exitBefore`
   * der Ausgang der letzten Seite der vorigen Antwort ist.
   */
  public paginate(answer: string, seed: number, exitBefore?: Gate): PaginatedAnswer {
    const { columns, rows, maze, restingDistance } = this.settings;
    const random = this.createRandom(seed);
    const borderCellPicker = new BorderCellPicker(random);
    const generator = new MazePageGenerator(columns, rows, random, this.font, maze);

    const capacity = textCapacityOf(columns, rows, maze.returnBandRows);
    const lines = new LineWrapper(capacity.charsPerLine).wrap(this.normalizer.normalize(answer));

    const pages: MazePage[] = [];
    let previousExit = exitBefore;
    for (let first = 0; first < lines.length; first += capacity.linesPerPage) {
      const entrance = previousExit
        ? entranceOppositeOf(previousExit, columns, rows)
        : borderCellPicker.pickFirstEntrance(columns, rows);
      const page = generator.generate(lines.slice(first, first + capacity.linesPerPage), entrance);
      pages.push(page);
      previousExit = page.exit;
    }

    return { pages, restingStepIndex: lastOf(pages).lastGlyphEnd + restingDistance };
  }
}
