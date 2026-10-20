import type { ScheduleTask } from "../ui/step-runner";

/**
 * Eine Warteschlange von Aufgaben, die der Test von Hand abarbeitet (statt `setTimeout`):
 * `schedule` reiht ein, `runNext` und `runAll` führen aus.
 */
export class ManualTaskQueue {
  private readonly tasks: (() => void)[] = [];

  /** Reiht eine Aufgabe ein. */
  public readonly schedule: ScheduleTask = (task) => {
    this.tasks.push(task);
  };

  /** Wie viele Aufgaben warten. */
  public get waiting(): number {
    return this.tasks.length;
  }

  /** Führt die älteste wartende Aufgabe aus; sagt, ob es eine gab. */
  public runNext(): boolean {
    const task = this.tasks.shift();
    task?.();
    return task !== undefined;
  }

  /** Führt Aufgaben aus, auch die, die dabei eingereiht werden, bis keine mehr wartet. */
  public runAll(): void {
    while (this.runNext()) {
      // weiter, bis die Warteschlange leer ist
    }
  }
}
