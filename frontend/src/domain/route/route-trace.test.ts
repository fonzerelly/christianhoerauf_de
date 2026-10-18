import { describe, expect, it } from "vitest";
import { RouteTrace } from "./route-trace";

describe("RouteTrace", () => {
  it("beginnt leer", () => {
    expect(new RouteTrace().steps).toEqual([]);
  });

  it("hängt ein Wegstück an und kennt dann das Ende", () => {
    const trace = new RouteTrace();

    trace.addStep({ x: 2, y: 3 }, "connector");

    expect(trace.steps).toEqual([{ x: 2, y: 3, kind: "connector", isDot: false }]);
    expect(trace.end).toEqual({ x: 2, y: 3 });
  });

  it("wirft, wenn man das Ende einer leeren Route erfragt", () => {
    expect(() => new RouteTrace().end).toThrow(RangeError);
  });

  it("läuft Zelle für Zelle nach rechts, links, unten und oben", () => {
    const trace = new RouteTrace();
    trace.addStep({ x: 0, y: 0 }, "connector");

    trace.walkTo(2, 0, "letter");
    trace.walkTo(2, 2, "silent");
    trace.walkTo(1, 2, "connector");
    trace.walkTo(1, 1, "letter");

    expect(trace.steps.map(({ x, y, kind }) => `${String(x)},${String(y)} ${kind}`)).toEqual([
      "0,0 connector",
      "1,0 letter",
      "2,0 letter",
      "2,1 silent",
      "2,2 silent",
      "1,2 connector",
      "1,1 letter",
    ]);
  });

  it("fügt nichts an, wenn das Ziel das Ende ist", () => {
    const trace = new RouteTrace();
    trace.addStep({ x: 4, y: 4 }, "connector");

    trace.walkTo(4, 4, "letter");

    expect(trace.steps).toHaveLength(1);
  });

  it("wirft, wenn das Ziel nicht in gerader Linie liegt", () => {
    const trace = new RouteTrace();
    trace.addStep({ x: 0, y: 0 }, "connector");

    expect(() => {
      trace.walkTo(1, 1, "letter");
    }).toThrow(RangeError);
  });

  it("macht die letzte Zelle zu einem Punkt", () => {
    const trace = new RouteTrace();
    trace.addStep({ x: 0, y: 0 }, "connector");
    trace.walkTo(0, 1, "silent");

    trace.markEndAsDot();

    expect(trace.steps.map((step) => step.isDot)).toEqual([false, true]);
  });

  it("merkt sich das Ende der letzten Glyphe", () => {
    const trace = new RouteTrace();
    trace.addStep({ x: 0, y: 0 }, "connector");
    trace.walkTo(0, 2, "letter");
    trace.markGlyphEnd();
    trace.walkTo(3, 2, "connector");

    expect(trace.lastGlyphEnd).toBe(2);
  });

  it("kennt noch kein Glyphenende, bevor eines markiert wurde", () => {
    expect(new RouteTrace().lastGlyphEnd).toBeUndefined();
  });
});
