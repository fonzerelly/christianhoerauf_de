import { describe, expect, it } from "vitest";
import { ManualTaskQueue } from "./manual-task-queue";

describe("ManualTaskQueue", () => {
  it("führt Aufgaben nicht aus, bevor der Test es verlangt", () => {
    const queue = new ManualTaskQueue();
    const log: string[] = [];

    queue.schedule(() => log.push("a"));

    expect(log).toEqual([]);
    expect(queue.waiting).toBe(1);
  });

  it("führt auf Wunsch die älteste Aufgabe aus und sagt, ob es eine gab", () => {
    const queue = new ManualTaskQueue();
    const log: string[] = [];
    queue.schedule(() => log.push("a"));
    queue.schedule(() => log.push("b"));

    expect(queue.runNext()).toBe(true);
    expect(log).toEqual(["a"]);
    expect(queue.runNext()).toBe(true);
    expect(queue.runNext()).toBe(false);
    expect(log).toEqual(["a", "b"]);
  });

  it("führt auch Aufgaben aus, die eine Aufgabe einreiht, bis nichts mehr wartet", () => {
    const queue = new ManualTaskQueue();
    const log: string[] = [];
    queue.schedule(() => {
      log.push("a");
      queue.schedule(() => log.push("b"));
    });

    queue.runAll();

    expect(log).toEqual(["a", "b"]);
    expect(queue.waiting).toBe(0);
  });
});
