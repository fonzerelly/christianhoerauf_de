import type { PageSource } from "../animation/page-source";
import { RectangularGrid } from "../domain/maze/rectangular-grid";
import type { PaginatedAnswer } from "../domain/pages/answer-paginator";
import type { MazePage } from "../domain/pages/maze-page-generator";
import type { Gate } from "../domain/route/gate";
import type { RouteStep } from "../domain/route/route-step";

/** Länge der Route jeder Attrappen-Seite: Wegstück 0 bis 11. */
export const ROUTE_LENGTH = 12;
/** Die letzte Glyphe endet auf Wegstück 5, der Haltepunkt liegt zwei Wegstücke dahinter. */
export const LAST_GLYPH_END = 5;
export const RESTING_STEP = LAST_GLYPH_END + 2;

/**
 * Eine Attrappe für die Seitenquelle der Animation: Jedes Zeichen des Texts wird eine kleine
 * Seite mit einer Route von 12 Wegstücken auf einer Linie. Jede Seite hat einen eigenen
 * Ausgang, und jede Anfrage wird in `requests` festgehalten.
 */
export class FakePageSource implements PageSource {
  public readonly requests: {
    text: string;
    seed: number;
    exitBefore: Gate | undefined;
  }[] = [];

  private pagesCreated = 0;

  public paginate(answer: string, seed: number, exitBefore?: Gate): PaginatedAnswer {
    this.requests.push({ text: answer, seed, exitBefore });
    const pages = Array.from(answer, () => this.createPage());
    return { pages, restingStepIndex: RESTING_STEP };
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
