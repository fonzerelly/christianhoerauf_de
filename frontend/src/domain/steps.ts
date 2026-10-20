// Berechnungen in Stücken: Die Domäne kennt keine Zeit und keinen Browser, kann ihre Arbeit aber
// so schreiben, dass ein Aufrufer sie zwischen zwei Stücken unterbricht (etwa um den Browser
// zwischendurch arbeiten zu lassen). Wer nicht unterbrechen will, ruft `runToEnd`.

/**
 * Eine Berechnung in Stücken: Jedes `yield` ist eine Stelle, an der der Aufrufer pausieren darf;
 * das Ergebnis steht am Ende (`return`). Zu schreiben als Generatorfunktion (`function*`).
 */
export type Steps<Result> = Generator<undefined, Result, undefined>;

/** Führt alle Stücke hintereinander aus, ohne Pause, und liefert das Ergebnis. */
export function runToEnd<Result>(steps: Steps<Result>): Result {
  for (;;) {
    const step = steps.next();
    if (step.done === true) return step.value;
  }
}
