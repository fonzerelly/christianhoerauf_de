import { describe, expect, it } from "vitest";
import type { RouteStep, StepKind } from "../domain/route/route-step";
import { RouteWalker } from "./route-walker";

function stepAt(x: number, kind: StepKind): RouteStep {
  return { x, y: 0, kind, isDot: false };
}

// Wegstück 0 ist der Start; 1 und 2 sind Schriftwege, 3 und 4 Verbindungswege.
const ROUTE: RouteStep[] = [
  stepAt(0, "connector"),
  stepAt(1, "letter"),
  stepAt(2, "letter"),
  stepAt(3, "connector"),
  stepAt(4, "connector"),
];

const paceOf = (kind: StepKind): number => (kind === "letter" ? 2 : 8);

function walkerAfter(seconds: number, target = 4): RouteWalker {
  const walker = new RouteWalker(ROUTE);
  walker.walk(seconds, target, paceOf);
  return walker;
}

describe("RouteWalker", () => {
  it("steht zu Beginn auf dem ersten Wegstück", () => {
    const walker = new RouteWalker(ROUTE);

    expect(walker.progress).toBe(0);
    expect(walker.stepsDone).toBe(0);
    expect(walker.position()).toEqual({ x: 0, y: 0 });
  });

  it("läuft in Schriftwegen mit deren Tempo", () => {
    const walker = walkerAfter(0.25);

    expect(walker.progress).toBe(0.5);
  });

  it("rechnet Wegstück für Wegstück ab, denn jede Art hat ein anderes Tempo", () => {
    // 1 s: Wegstück 1 dauert 0,5 s, Wegstück 2 dauert 0,5 s => genau 2 Wegstücke
    expect(walkerAfter(1).progress).toBe(2);
    // 1,0625 s: dann 0,0625 s im Verbindungsweg mit 8 Zellen/s => ein halbes Wegstück weiter
    expect(walkerAfter(1.0625).progress).toBe(2.5);
    // 1,25 s: das Wegstück 3 ist nach 0,125 s fertig, 0,125 s bleiben fürs Wegstück 4
    expect(walkerAfter(1.25).progress).toBe(4);
  });

  it("läuft nie über das Ziel hinaus, auch bei viel Zeit", () => {
    expect(walkerAfter(100, 2).progress).toBe(2);
    expect(walkerAfter(100).progress).toBe(4);
  });

  it("läuft nie über das Ende der Route hinaus, auch wenn das Ziel dahinter liegt", () => {
    expect(walkerAfter(100, 99).progress).toBe(4);
  });

  it("bleibt stehen, wenn das Ziel schon erreicht ist, oder wenn keine Zeit vergeht", () => {
    const walker = walkerAfter(0.75);

    walker.walk(0, 4, paceOf);
    expect(walker.progress).toBe(1.5);
    walker.walk(10, 1, paceOf);
    expect(walker.progress).toBe(1.5);
  });

  it("merkt sich die Wegstücke, die ein Aufruf fertig gelaufen ist", () => {
    const walker = new RouteWalker(ROUTE);

    expect(walker.walk(1, 4, paceOf)).toEqual({ stepsDoneBefore: 0, stepsDoneNow: 2 });
    expect(walker.walk(0.0625, 4, paceOf)).toEqual({ stepsDoneBefore: 2, stepsDoneNow: 2 });
  });

  it("meldet, ob ein Ziel erreicht ist", () => {
    const walker = walkerAfter(0.5);

    expect(walker.hasReached(1)).toBe(true);
    expect(walker.hasReached(2)).toBe(false);
  });

  it("gibt die Stelle zwischen zwei Wegstücken als Mischung beider an", () => {
    const walker = walkerAfter(0.75);

    expect(walker.stepsDone).toBe(1);
    expect(walker.position()).toEqual({ x: 1.5, y: 0 });
  });

  it("steht am Ende der Route auf dem letzten Wegstück", () => {
    const walker = walkerAfter(100);

    expect(walker.position()).toEqual({ x: 4, y: 0 });
    expect(walker.stepsDone).toBe(4);
  });
});
