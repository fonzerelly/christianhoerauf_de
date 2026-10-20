import { describe, expect, it } from "vitest";
import { itemAt } from "../domain/lists";
import type { PaginatedAnswer } from "../domain/pages/answer-paginator";
import type { MazePage } from "../domain/pages/maze-page-generator";
import type { Gate } from "../domain/route/gate";
import type { Steps } from "../domain/steps";
import { ManualTaskQueue } from "../test-support/manual-task-queue";
import { mazePage } from "../test-support/maze-page-builder";
import { PreparedPageSource } from "./prepared-page-source";

const EXIT: Gate = { cell: { x: 1, y: 1 }, side: "right" };

/** Eine Berechnung in `count` Stücken, die jedes Stück mit `label` ins Protokoll schreibt. */
function loggingSteps<Result>(
  log: string[],
  label: string,
  count: number,
  result: Result,
): Steps<Result> {
  function* steps(): Steps<Result> {
    for (let step = 1; step <= count; step++) {
      log.push(`${label} ${String(step)}`);
      yield;
    }
    return result;
  }
  return steps();
}

function setup(pageCount: number) {
  const log: string[] = [];
  const pages = Array.from({ length: pageCount }, () => mazePage({}));
  const produced: PaginatedAnswer = { pages, restingStepIndex: 5 };
  const requests: { answer: string; seed: number; exitBefore: Gate | undefined }[] = [];
  const queue = new ManualTaskQueue();
  const source = new PreparedPageSource(
    {
      paginateInSteps: (answer, seed, exitBefore) => {
        requests.push({ answer, seed, exitBefore });
        return loggingSteps(log, "erzeugen", 2, produced);
      },
      restingStepOf: (page) => pages.indexOf(page) + 100,
    },
    {
      prepare: (page: MazePage) =>
        loggingSteps(log, `vorbereiten ${String(pages.indexOf(page) + 1)}`, 1, undefined),
    },
    queue.schedule,
  );
  return { source, log, pages, produced, requests, queue };
}

/** Arbeitet alle Aufgaben ab und lässt dazwischen die Versprechen ihre Folgen ausführen. */
async function runUntilIdle(queue: ManualTaskQueue): Promise<void> {
  do {
    queue.runAll();
    for (let tick = 0; tick < 6; tick++) await Promise.resolve();
  } while (queue.waiting > 0);
}

describe("PreparedPageSource", () => {
  it("gibt Text, Startwert und Anschluss an die Erzeugung der Seiten weiter", async () => {
    const { source, requests, queue } = setup(1);

    void source.paginate("Hallo", 7, EXIT);
    await runUntilIdle(queue);

    expect(requests).toEqual([{ answer: "Hallo", seed: 7, exitBefore: EXIT }]);
  });

  it("rechnet nichts, bevor der Browser die erste Aufgabe ausführt", () => {
    const { source, log, queue } = setup(1);

    void source.paginate("Hallo", 7);

    expect(log).toEqual([]);
    expect(queue.waiting).toBe(1);
  });

  it("liefert die Seiten erst, wenn sie erzeugt und die erste vorab gezeichnet ist", async () => {
    const { source, log, pages, produced, queue } = setup(2);

    const result = source.paginate("Hallo", 7).then((answer) => {
      log.push("geliefert");
      return answer;
    });
    await runUntilIdle(queue);

    expect(await result).toBe(produced);
    expect(produced.pages).toBe(pages);
    expect(log.slice(0, 4)).toEqual(["erzeugen 1", "erzeugen 2", "vorbereiten 1 1", "geliefert"]);
  });

  it("zeichnet nur die erste Seite vorab; die weiteren Seiten bereitet die Bühne vor, wenn sie an die Reihe kommen", async () => {
    const { source, log, queue } = setup(3);

    void source.paginate("Hallo", 7);
    await runUntilIdle(queue);

    expect(log.filter((entry) => entry.startsWith("vorbereiten"))).toEqual(["vorbereiten 1 1"]);
  });

  it("nennt den Haltepunkt einer Seite so, wie die Erzeugung es tut", () => {
    const { source, pages } = setup(2);

    expect(source.restingStepOf(itemAt(pages, 1))).toBe(101);
  });
});
