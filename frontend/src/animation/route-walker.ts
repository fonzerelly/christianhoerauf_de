import { itemAt } from "../domain/lists";
import type { Position } from "../domain/maze/position";
import type { RouteStep, StepKind } from "../domain/route/route-step";

/** Welche Wegstücke ein Aufruf von `walk` neu fertig gelaufen ist: `stepsDoneBefore + 1` bis `stepsDoneNow`. */
export interface WalkedRange {
  readonly stepsDoneBefore: number;
  readonly stepsDoneNow: number;
}

/**
 * Lässt den Lichtpunkt eine Route ablaufen. Der Fortschritt zählt Wegstücke mit Nachkommastellen:
 * 2,5 heißt, das zweite Wegstück ist fertig und das dritte zur Hälfte gelaufen.
 */
export class RouteWalker {
  private walkedProgress = 0;

  public constructor(private readonly route: readonly RouteStep[]) {}

  /** Wie viele Wegstücke der Lichtpunkt schon gelaufen ist, mit Nachkommastellen. */
  public get progress(): number {
    return this.walkedProgress;
  }

  /** Wie viele Wegstücke schon ganz gelaufen sind. */
  public get stepsDone(): number {
    return Math.min(Math.floor(this.walkedProgress), this.route.length - 1);
  }

  public hasReached(step: number): boolean {
    return this.walkedProgress >= step;
  }

  /**
   * Lässt den Lichtpunkt `seconds` lang laufen, aber nicht weiter als bis `targetStep`. Weil
   * jede Art von Wegstück ein anderes Tempo hat, wird Wegstück für Wegstück abgerechnet: jedes
   * verbraucht so viel von der Zeit, wie es bei seinem Tempo dauert.
   */
  public walk(
    seconds: number,
    targetStep: number,
    paceOf: (kind: StepKind) => number,
  ): WalkedRange {
    const stepsDoneBefore = this.stepsDone;
    const lastStep = Math.min(targetStep, this.route.length - 1);
    let secondsLeft = seconds;

    while (secondsLeft > 0 && this.walkedProgress < lastStep) {
      const nextStep = Math.floor(this.walkedProgress) + 1;
      const pace = paceOf(itemAt(this.route, nextStep).kind);
      const secondsToFinishStep = (nextStep - this.walkedProgress) / pace;

      if (secondsLeft >= secondsToFinishStep) {
        this.walkedProgress = nextStep;
        secondsLeft -= secondsToFinishStep;
      } else {
        this.walkedProgress += secondsLeft * pace;
        secondsLeft = 0;
      }
    }
    return { stepsDoneBefore, stepsDoneNow: this.stepsDone };
  }

  /** Wo der Lichtpunkt steht, auch zwischen zwei Zellen (dann mit Nachkommastellen). */
  public position(): Position {
    const from = itemAt(this.route, this.stepsDone);
    const to = itemAt(this.route, Math.min(this.stepsDone + 1, this.route.length - 1));
    const partOfStep = this.walkedProgress - this.stepsDone;
    return {
      x: from.x + (to.x - from.x) * partOfStep,
      y: from.y + (to.y - from.y) * partOfStep,
    };
  }
}
