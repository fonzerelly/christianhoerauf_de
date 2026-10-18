import { describe, expect, it } from "vitest";
import { MazeGrower } from "../maze/maze-grower";
import { PathFinder } from "../maze/path-finder";
import { WindingPathFinder } from "../maze/winding-path-finder";
import { Mulberry32 } from "../random/mulberry32";
import { AreaPathFinder } from "./area-path-finder";
import { LineChangePlanner } from "./line-change-planner";
import { RouteTrace } from "./route-trace";

function createPlanner(seed: number): LineChangePlanner {
  const winding = new WindingPathFinder(new MazeGrower(new Mulberry32(seed)), new PathFinder());
  return new LineChangePlanner(new AreaPathFinder(34, 60, winding));
}

// Die Zeile darüber endet auf der Grundlinie (15, 28). Darunter liegt das Band (Zeilen 29 und
// 30), und die nächste Zeile hat ihre Grundlinie in Zeile 36, ihr Anfang liegt bei Spalte 12.
const BAND = { left: 12, right: 20, top: 29, bottom: 30 };

function planFrom(seed: number): RouteTrace {
  const trace = new RouteTrace();
  trace.addStep({ x: 15, y: 28 }, "connector");
  createPlanner(seed).appendLineChange(trace, BAND, 12, 36, 0.5);
  return trace;
}

describe("LineChangePlanner", () => {
  it("läuft vom Zeilenende nach unten ins Band und durch das Band zur Abstiegsspalte", () => {
    for (let seed = 1; seed <= 10; seed++) {
      const steps = planFrom(seed).steps;

      expect(steps[1]).toMatchObject({ x: 15, y: 29 });
      const inBand = steps.filter(({ y }) => y >= BAND.top && y <= BAND.bottom);
      expect(inBand.every(({ x }) => x >= BAND.left && x <= BAND.right)).toBe(true);
    }
  });

  it("steigt in der Abstiegsspalte bis zur Grundlinie der nächsten Zeile ab", () => {
    const steps = planFrom(3).steps;

    expect(steps.at(-1)).toMatchObject({ x: 12, y: 36 });
    expect(steps.slice(-7).map(({ x, y }) => `${String(x)},${String(y)}`)).toEqual(
      [30, 31, 32, 33, 34, 35, 36].map((y) => `12,${String(y)}`),
    );
  });

  it("legt nur Verbindungswege an, die jeweils eine Zelle weiterführen", () => {
    const steps = planFrom(5).steps;

    expect(steps.length).toBeGreaterThan(8);
    steps.slice(1).forEach((step, index) => {
      const before = steps[index] ?? step;
      expect(step.kind).toBe("connector");
      expect(Math.abs(step.x - before.x) + Math.abs(step.y - before.y)).toBe(1);
    });
  });
});
