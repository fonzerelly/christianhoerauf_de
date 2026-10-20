import type { PageSource } from "../animation/page-source";
import { itemAt } from "../domain/lists";
import type { PaginatedAnswer } from "../domain/pages/answer-paginator";
import type { MazePage } from "../domain/pages/maze-page-generator";
import type { Gate } from "../domain/route/gate";
import type { Steps } from "../domain/steps";
import { runInTasks } from "./step-runner";
import type { ScheduleTask } from "./step-runner";

/** Erzeugt die Seiten einer Antwort in Stücken; der `AnswerPaginator` der Domäne erfüllt das. */
export interface PageProducer {
  paginateInSteps(answer: string, seed: number, exitBefore?: Gate): Steps<PaginatedAnswer>;
  restingStepOf(page: MazePage): number;
}

/** Zeichnet eine Seite vorab, in Stücken; der `Renderer` erfüllt das. */
export interface PagePreparer {
  prepare(page: MazePage): Steps<void>;
}

/**
 * Die Seitenquelle der Bühne: Sie erzeugt die Seiten einer Antwort in Stücken und zeichnet die
 * erste vorab, jedes Stück in einer eigenen Aufgabe des Browsers. Dazwischen kann er Bilder
 * zeichnen und auf Eingaben antworten; ohne diese Aufteilung blockierte der Start des Browsers
 * mehrere hundert Millisekunden am Stück.
 *
 * Geliefert wird, sobald die Seiten da sind und die erste vorab gezeichnet ist: Wenn die Animation
 * sie zeigt, kostet das erste Bild nur noch das Kopieren. Die weiteren Seiten werden erst
 * gebraucht, wenn die Animation sie als nächste Seite zeigt; die Bühne zeichnet sie dann vorab.
 */
export class PreparedPageSource implements PageSource {
  public constructor(
    private readonly producer: PageProducer,
    private readonly preparer: PagePreparer,
    private readonly scheduleTask: ScheduleTask,
  ) {}

  public async paginate(answer: string, seed: number, exitBefore?: Gate): Promise<PaginatedAnswer> {
    const result = await runInTasks(
      this.producer.paginateInSteps(answer, seed, exitBefore),
      this.scheduleTask,
    );
    await runInTasks(this.preparer.prepare(itemAt(result.pages, 0)), this.scheduleTask);
    return result;
  }

  public restingStepOf(page: MazePage): number {
    return this.producer.restingStepOf(page);
  }
}
