import type { Font } from "../font/font";
import { lastOf } from "../lists";
import type { RandomSource } from "../random/random-source";
import { runToEnd } from "../steps";
import type { Steps } from "../steps";
import { entranceOppositeOf, gateInGrid } from "../route/gate";
import type { Gate } from "../route/gate";
import { pickOne } from "../random/random-choices";
import type { TextAlignment } from "../route/text-block-layout";
import { LineWrapper } from "../text/line-wrapper";
import type { TextNormalizer } from "../text/text-normalizer";
import { MazePageGenerator } from "./maze-page-generator";
import type { AnswerContent, PhotoAnswer, PictureAnswer } from "./answer-content";
import type { MazePage, MazeSettings } from "./maze-page-generator";
import { placePhoto, ROWS_NEEDED_FOR_PHOTO } from "./photo-layout";
import type { PlacedPhoto } from "./photo-layout";
import { placePicture, rowsNeededForPicture } from "./picture-layout";
import type { PlacedPicture } from "./picture-layout";
import { textCapacityOf } from "./text-capacity";

interface Grid {
  readonly columns: number;
  readonly rows: number;
}

/**
 * Eine Seite im feineren Raster bekommt ihren Maßstab (`cellScale`) und ihren Ausgang im Raster der
 * Bühne (`handOver`); eine Seite im Raster der Bühne bleibt, wie sie ist. Steht außerhalb des
 * Generators, weil v8 eine Verzweigung nach `yield*` falsch zählt (-2 statt 0).
 */
function scaledToStage(page: MazePage, grid: Grid, stage: Grid): MazePage {
  if (grid === stage) return page;
  return {
    ...page,
    cellScale: stage.rows / grid.rows,
    handOver: gateInGrid(page.exit, grid, stage),
  };
}

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
    // Die Lage des Worts zieht als Erstes: links, mittig oder rechts, für alle Seiten der Antwort.
    const alignment = pickOne<TextAlignment>(["left", "center", "right"], random);
    const generator = new MazePageGenerator(columns, rows, random, this.font, maze);
    const firstEntrance =
      exitBefore === undefined ? undefined : entranceOppositeOf(exitBefore, columns, rows);

    if ("picture" in answer || "photo" in answer) {
      const page = yield* this.gimmickPageInSteps(answer, random, exitBefore);
      if (page !== undefined) return { pages: [page], restingStepIndex: this.restingStepOf(page) };
    }

    const keyword = answer.keyword?.trim() ?? "";
    if (keyword === "") {
      const page = yield* generator.generatePathInSteps(firstEntrance);
      return { pages: [page], restingStepIndex: this.restingStepOf(page) };
    }

    const capacity = textCapacityOf(columns, rows, maze.returnBandRows);
    const wrapper = new LineWrapper(capacity.charsPerLine);
    // Jeder Teil zwischen zwei „\n“ wird für sich aufbereitet und umgebrochen (erzwungener Umbruch).
    const lines = keyword
      .split("\n")
      .flatMap((part) => wrapper.wrap(this.normalizer.normalize(part)));
    const maxLines = "maxLinesPerPage" in answer ? answer.maxLinesPerPage : 1;
    const linesPerPage = Math.max(1, Math.min(capacity.linesPerPage, maxLines));

    const pages: MazePage[] = [];
    let entrance = firstEntrance;
    for (let first = 0; first < lines.length; first += linesPerPage) {
      const page = yield* generator.generateInSteps(
        lines.slice(first, first + linesPerPage),
        entrance,
        alignment,
      );
      pages.push(page);
      entrance = entranceOppositeOf(page.exit, columns, rows);
    }

    return { pages, restingStepIndex: this.restingStepOf(lastOf(pages)) };
  }

  /**
   * Die Seite mit Bild oder Foto (ADR 0007): im Raster der Bühne, wenn es dort passt. Sonst, wenn
   * der Bühne Reihen fehlen, in einem feineren Raster auf derselben Fläche: so viele Reihen, wie
   * das Gimmick mindestens braucht, und die Spalten im selben Verhältnis. Eine solche Seite trägt
   * ihren Maßstab (`cellScale`) und ihren Ausgang im Raster der Bühne (`handOver`); der Ausgang der
   * vorigen Antwort wird in ihr Raster umgerechnet. Passt es auch dort nicht: `undefined` (dann
   * schreibt der Lichtpunkt das Stichwort).
   */
  private *gimmickPageInSteps(
    answer: PictureAnswer | PhotoAnswer,
    random: RandomSource,
    exitBefore: Gate | undefined,
  ): Steps<MazePage | undefined> {
    const { columns, rows, maze } = this.settings;
    const stage: Grid = { columns, rows };
    const place = (grid: Grid): PlacedPicture | PlacedPhoto | undefined =>
      "picture" in answer
        ? placePicture(answer.picture, grid.columns, grid.rows)
        : placePhoto(answer.photo, grid.columns, grid.rows, random);
    const neededRows =
      "picture" in answer ? rowsNeededForPicture(answer.picture) : ROWS_NEEDED_FOR_PHOTO;

    let grid: Grid = stage;
    let placed = place(grid);
    if (placed === undefined && neededRows > rows) {
      grid = { columns: Math.floor((columns * neededRows) / rows), rows: neededRows };
      placed = place(grid);
    }
    if (placed === undefined) return undefined;

    const generator = new MazePageGenerator(grid.columns, grid.rows, random, this.font, maze);
    const entrance =
      exitBefore === undefined
        ? undefined
        : entranceOppositeOf(gateInGrid(exitBefore, stage, grid), grid.columns, grid.rows);
    const page =
      "picture" in placed
        ? yield* generator.generatePictureInSteps(placed, entrance)
        : yield* generator.generatePhotoInSteps(placed, entrance);
    return scaledToStage(page, grid, stage);
  }
}
