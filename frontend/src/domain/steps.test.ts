import { describe, expect, it } from "vitest";
import { runToEnd } from "./steps";
import type { Steps } from "./steps";

function countingSteps(count: number, log: string[]): Steps<string> {
  function* steps(): Steps<string> {
    for (let step = 1; step <= count; step++) {
      log.push(`Stück ${String(step)}`);
      yield;
    }
    return "fertig";
  }
  return steps();
}

describe("runToEnd", () => {
  it("führt alle Stücke nacheinander aus und liefert das Ergebnis", () => {
    const log: string[] = [];

    const result = runToEnd(countingSteps(3, log));

    expect(result).toBe("fertig");
    expect(log).toEqual(["Stück 1", "Stück 2", "Stück 3"]);
  });

  it("liefert auch das Ergebnis einer Berechnung ohne ein einziges Zwischenstück", () => {
    expect(runToEnd(countingSteps(0, []))).toBe("fertig");
  });
});
