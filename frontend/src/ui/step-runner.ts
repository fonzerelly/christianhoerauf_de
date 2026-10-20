import type { Steps } from "../domain/steps";

/** Reiht eine Aufgabe ein, die der Browser später und für sich allein ausführt. */
export type ScheduleTask = (task: () => void) => void;

/**
 * Rechnet eine Berechnung in Stücken (`Steps`) ab, jedes Stück in einer eigenen Aufgabe des
 * Browsers. Dazwischen kann er Bilder zeichnen und auf Eingaben antworten, statt von einer langen
 * Aufgabe blockiert zu werden. Das Versprechen liefert das Ergebnis und scheitert, wenn ein Stück
 * wirft.
 */
export function runInTasks<Result>(
  steps: Steps<Result>,
  scheduleTask: ScheduleTask,
): Promise<Result> {
  return new Promise<Result>((resolve, reject) => {
    const runOneStep = (): void => {
      try {
        const step = steps.next();
        if (step.done === true) resolve(step.value);
        else scheduleTask(runOneStep);
      } catch (error) {
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    };
    scheduleTask(runOneStep);
  });
}
