import type { PageSource } from "../animation/page-source";
import { RectangularGrid } from "../domain/maze/rectangular-grid";
import type { AnswerContent, WrittenAnswer } from "../domain/pages/answer-content";
import type { PaginatedAnswer } from "../domain/pages/answer-paginator";
import type { MazePage } from "../domain/pages/maze-page-generator";
import type { Gate } from "../domain/route/gate";
import type { RouteStep } from "../domain/route/route-step";

/** Eine Antwort, deren Stichwort geschrieben wird, eine Zeile je Seite (für Tests). */
export function written(keyword: string): WrittenAnswer {
  return { keyword, maxLinesPerPage: 1 };
}

/** Länge der Route jeder Attrappen-Seite: Wegstück 0 bis 11. */
export const ROUTE_LENGTH = 12;
/** Die letzte Glyphe endet auf Wegstück 5, der Haltepunkt liegt zwei Wegstücke dahinter. */
export const LAST_GLYPH_END = 5;
export const RESTING_STEP = LAST_GLYPH_END + 2;

/**
 * Eine Attrappe für die Seitenquelle der Animation: Jedes Zeichen des Stichworts wird eine kleine
 * Seite (ohne Stichwort, und ein Bild oder Foto, wird es eine einzige Seite) mit einer Route von 12 Wegstücken auf einer
 * Linie. Jede Seite hat einen eigenen Ausgang, und jede Anfrage wird in `requests` festgehalten. Die Seiten kommen sofort, oder auf
 * Wunsch erst nach `releaseResults()` (so lässt sich das Warten auf die Seiten nachstellen).
 */
export class FakePageSource implements PageSource {
  public readonly requests: {
    /** Das Stichwort (bei Bild oder Foto das für den Fall, dass es nicht passt); ohne: "". */
    text: string;
    picture?: string;
    photo?: string;
    seed: number;
    exitBefore: Gate | undefined;
  }[] = [];

  private pagesCreated = 0;
  private isHolding = false;
  private readonly held: (() => void)[] = [];

  public paginate(
    answer: AnswerContent,
    seed: number,
    exitBefore?: Gate,
  ): Promise<PaginatedAnswer> {
    const text = answer.keyword ?? "";
    if ("picture" in answer) {
      this.requests.push({ text, picture: answer.picture, seed, exitBefore });
    } else if ("photo" in answer) {
      this.requests.push({ text, photo: answer.photo, seed, exitBefore });
    } else this.requests.push({ text, seed, exitBefore });
    const isWritten = "maxLinesPerPage" in answer && text !== "";
    const pages = isWritten ? Array.from(text, () => this.createPage()) : [this.createPage()];
    const result = { pages, restingStepIndex: RESTING_STEP };
    if (!this.isHolding) return Promise.resolve(result);
    return new Promise((resolve) => {
      this.held.push(() => {
        resolve(result);
      });
    });
  }

  /** Ab jetzt liefern Anfragen ihre Seiten erst nach `releaseResults()`. */
  public holdResults(): void {
    this.isHolding = true;
  }

  /** Löst alle zurückgehaltenen Anfragen ein. */
  public releaseResults(): void {
    this.isHolding = false;
    this.held.splice(0).forEach((release) => {
      release();
    });
  }

  public restingStepOf(page: MazePage): number {
    return page.lastGlyphEnd + 2;
  }

  private createPage(): MazePage {
    this.pagesCreated++;
    const route: RouteStep[] = Array.from({ length: ROUTE_LENGTH }, (_, index) => ({
      x: index,
      y: 0,
      kind: "letter",
      isDot: false,
    }));
    const exit: Gate = { cell: { x: this.pagesCreated, y: 0 }, side: "right" };
    return {
      grid: new RectangularGrid(2, 2),
      route,
      entrance: { cell: { x: 0, y: 0 }, side: "left" },
      exit,
      lines: [],
      lastGlyphEnd: LAST_GLYPH_END,
    };
  }
}
