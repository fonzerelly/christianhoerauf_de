import type { Font } from "../font/font";
import { lastOf } from "../lists";
import type { RandomSource } from "../random/random-source";
import { runToEnd } from "../steps";
import type { Steps } from "../steps";
import { BorderCellPicker } from "../route/border-cell-picker";
import { entranceOppositeOf } from "../route/gate";
import type { Gate } from "../route/gate";
import { LineWrapper } from "../text/line-wrapper";
import type { TextNormalizer } from "../text/text-normalizer";
import { MazePageGenerator } from "./maze-page-generator";
import type { AnswerContent } from "./answer-content";
import type { MazePage, MazeSettings } from "./maze-page-generator";
import { placePhoto } from "./photo-layout";
import { placePicture } from "./picture-layout";
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

/**
 * Der Eingang einer Seite: gegenüber dem Ausgang der vorigen Seite, oder ohne vorige Seite
 * gewürfelt.
 */
function previousExitOrFirst(
  previousExit: Gate | undefined,
  borderCellPicker: BorderCellPicker,
  columns: number,
  rows: number,
): Gate {
  return previousExit
    ? entranceOppositeOf(previousExit, columns, rows)
    : borderCellPicker.pickFirstEntrance(columns, rows);
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
   * Der Haltepunkt einer Seite: das Wegstück `restingDistance` hinter dem Ende ihrer letzten
   * Glyphe. Auch eine Seite mitten in einer Antwort hat einen, falls die Antwort an ihr endet.
   */
  public restingStepOf(page: MazePage): number {
    return page.lastGlyphEnd + this.settings.restingDistance;
  }

  /**
   * Bereitet die Antwort auf, bricht sie um und erzeugt für die Zeilen so viele Seiten, wie sie
   * braucht. Ist die Antwort ein Bild, wird es eine einzige Seite mit dem Bild; ist sie ein Foto,
   * eine einzige Seite, auf der das Foto an einer zufälligen Stelle liegt (erst wird die Stelle
   * gezogen, dann der Eingang). Passt Bild oder Foto nicht auf die Seite, wird ihr Text
   * geschrieben. Aller Zufall folgt aus `seed`.
   *
   * Jede Folgeseite beginnt dort, wo die vorige aufgehört hat: Ihr Eingang liegt dem Ausgang der
   * vorigen genau gegenüber. Dasselbe gilt für die erste Seite einer Antwort, wenn `exitBefore`
   * der Ausgang der letzten Seite der vorigen Antwort ist.
   */
  public paginate(answer: AnswerContent, seed: number, exitBefore?: Gate): PaginatedAnswer {
    return runToEnd(this.paginateInSteps(answer, seed, exitBefore));
  }

  /**
   * Wie `paginate`, aber in Stücken (siehe `Steps`): Die Erzeugung jeder Seite pausiert zweimal
   * (siehe `MazePageGenerator.generateInSteps`). Das Ergebnis ist dasselbe.
   */
  public *paginateInSteps(
    answer: AnswerContent,
    seed: number,
    exitBefore?: Gate,
  ): Steps<PaginatedAnswer> {
    const { columns, rows, maze } = this.settings;
    const random = this.createRandom(seed);
    const borderCellPicker = new BorderCellPicker(random);
    const generator = new MazePageGenerator(columns, rows, random, this.font, maze);

    if (typeof answer !== "string" && "picture" in answer) {
      const placed = placePicture(answer.picture, columns, rows);
      if (placed !== undefined) {
        const entrance = previousExitOrFirst(exitBefore, borderCellPicker, columns, rows);
        const page = yield* generator.generatePictureInSteps(placed, entrance);
        return { pages: [page], restingStepIndex: this.restingStepOf(page) };
      }
    }

    if (typeof answer !== "string" && "photo" in answer) {
      const placed = placePhoto(answer.photo, columns, rows, random);
      if (placed !== undefined) {
        const entrance = previousExitOrFirst(exitBefore, borderCellPicker, columns, rows);
        const page = yield* generator.generatePhotoInSteps(placed, entrance);
        return { pages: [page], restingStepIndex: this.restingStepOf(page) };
      }
    }

    const text = typeof answer === "string" ? answer : answer.text;
    const capacity = textCapacityOf(columns, rows, maze.returnBandRows);
    const lines = new LineWrapper(capacity.charsPerLine).wrap(this.normalizer.normalize(text));

    const pages: MazePage[] = [];
    let previousExit = exitBefore;
    for (let first = 0; first < lines.length; first += capacity.linesPerPage) {
      const entrance = previousExitOrFirst(previousExit, borderCellPicker, columns, rows);
      const page = yield* generator.generateInSteps(
        lines.slice(first, first + capacity.linesPerPage),
        entrance,
      );
      pages.push(page);
      previousExit = page.exit;
    }

    return { pages, restingStepIndex: this.restingStepOf(lastOf(pages)) };
  }
}
