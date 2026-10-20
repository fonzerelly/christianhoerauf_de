import { describe, expect, it } from "vitest";
import type { Steps } from "../domain/steps";
import { ManualTaskQueue } from "../test-support/manual-task-queue";
import { runInTasks } from "./step-runner";

function loggingSteps(log: string[], count: number): Steps<string> {
  function* steps(): Steps<string> {
    for (let step = 1; step <= count; step++) {
      log.push(`Stück ${String(step)}`);
      yield;
    }
    log.push("Ende");
    return "Ergebnis";
  }
  return steps();
}

describe("runInTasks", () => {
  it("rechnet nichts, bevor die erste Aufgabe läuft", () => {
    const log: string[] = [];
    const queue = new ManualTaskQueue();

    void runInTasks(loggingSteps(log, 2), queue.schedule);

    expect(log).toEqual([]);
    expect(queue.waiting).toBe(1);
  });

  it("rechnet in jeder Aufgabe genau ein Stück und reiht dann die nächste Aufgabe ein", () => {
    const log: string[] = [];
    const queue = new ManualTaskQueue();
    void runInTasks(loggingSteps(log, 2), queue.schedule);

    queue.runNext();
    expect(log).toEqual(["Stück 1"]);
    expect(queue.waiting).toBe(1);

    queue.runNext();
    expect(log).toEqual(["Stück 1", "Stück 2"]);
    expect(queue.waiting).toBe(1);

    queue.runNext();
    expect(log).toEqual(["Stück 1", "Stück 2", "Ende"]);
    expect(queue.waiting).toBe(0);
  });

  it("liefert das Ergebnis, sobald das letzte Stück gerechnet ist", async () => {
    const queue = new ManualTaskQueue();
    const result = runInTasks(loggingSteps([], 2), queue.schedule);

    queue.runAll();

    await expect(result).resolves.toBe("Ergebnis");
  });

  it("scheitert mit dem Fehler, wenn ein Stück wirft, und rechnet nicht weiter", async () => {
    const queue = new ManualTaskQueue();
    function* failing(): Steps<string> {
      yield;
      throw new Error("kaputt");
    }
    const result = runInTasks(failing(), queue.schedule);
    // Das Ergebnis wird erst unten erwartet; bis dahin darf der Fehler nicht als unbehandelt gelten.
    const outcome = expect(result).rejects.toThrow("kaputt");

    queue.runAll();

    await outcome;
    expect(queue.waiting).toBe(0);
  });

  it("macht aus einem geworfenen Wert, der kein Fehler ist, einen Fehler", async () => {
    const queue = new ManualTaskQueue();
    function* failing(): Steps<string> {
      yield;
      // eslint-disable-next-line @typescript-eslint/only-throw-error -- genau dieser Fall wird geprüft
      throw "kein Fehler-Objekt";
    }
    const outcome = expect(runInTasks(failing(), queue.schedule)).rejects.toThrow(
      "kein Fehler-Objekt",
    );

    queue.runAll();

    await outcome;
  });
});
