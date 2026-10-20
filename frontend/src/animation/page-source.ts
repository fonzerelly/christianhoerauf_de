import type { PaginatedAnswer } from "../domain/pages/answer-paginator";
import type { MazePage } from "../domain/pages/maze-page-generator";
import type { Gate } from "../domain/route/gate";

/**
 * Woher die Animation die Labyrinth-Seiten einer Antwort bekommt. Die Seiten entstehen nicht
 * sofort: Die Quelle erzeugt sie in Stücken (`AnswerPaginator.paginateInSteps`) und lässt dem
 * Browser dazwischen Zeit, und sie kann sie vorab zeichnen lassen, bevor sie sie liefert.
 * Im Test steht eine Attrappe mit kleinen Seiten dafür.
 */
export interface PageSource {
  /**
   * Erzeugt die Seiten der Antwort; die erste schließt an `exitBefore` an. Das Versprechen
   * wird eingelöst, sobald die Seiten bereit sind.
   */
  paginate(answer: string, seed: number, exitBefore?: Gate): Promise<PaginatedAnswer>;
  /** Das Wegstück, an dem der Lichtpunkt wartet, wenn die Antwort auf dieser Seite endet. */
  restingStepOf(page: MazePage): number;
}
