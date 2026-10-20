import type { PaginatedAnswer } from "../domain/pages/answer-paginator";
import type { MazePage } from "../domain/pages/maze-page-generator";
import type { Gate } from "../domain/route/gate";

/**
 * Woher die Animation die Labyrinth-Seiten einer Antwort bekommt. Der `AnswerPaginator` der
 * Domäne erfüllt diese Schnittstelle; im Test steht eine Attrappe mit kleinen Seiten dafür.
 */
export interface PageSource {
  /** Erzeugt die Seiten der Antwort; die erste schließt an `exitBefore` an. */
  paginate(answer: string, seed: number, exitBefore?: Gate): PaginatedAnswer;
  /** Das Wegstück, an dem der Lichtpunkt wartet, wenn die Antwort auf dieser Seite endet. */
  restingStepOf(page: MazePage): number;
}
