import { describe, expect, it } from "vitest";
import type { Glyph } from "../font/glyph";
import { appendGlyph } from "./glyph-route";
import { RouteTrace } from "./route-trace";

/** Beschreibt die Route kurz: "x,y Art" je Wegstück, Punkte mit "*". */
function describeSteps(trace: RouteTrace): string[] {
  return trace.steps.map(
    ({ x, y, kind, isDot }) => `${String(x)},${String(y)} ${kind}${isDot ? " *" : ""}`,
  );
}

/** Eine Route, die auf der Grundlinie unter einer Glyphe bei Spalte `x` steht. */
function traceOnBaselineAt(x: number, baselineRow: number): RouteTrace {
  const trace = new RouteTrace();
  trace.addStep({ x, y: baselineRow }, "connector");
  return trace;
}

describe("appendGlyph", () => {
  it("steigt von der Grundlinie auf (Verbindungsweg) und läuft dann Schriftwege", () => {
    const glyphL: Glyph = [
      { x: 0, y: 4 },
      { x: 0, y: 2 },
      { x: 0, y: 4 },
      { x: 2, y: 4 },
    ];
    const trace = traceOnBaselineAt(10, 25);

    appendGlyph(trace, glyphL, 10, 20);

    expect(describeSteps(trace)).toEqual([
      "10,25 connector",
      "10,24 connector",
      "10,23 letter",
      "10,22 letter",
      "10,23 letter",
      "10,24 letter",
      "11,24 letter",
      "12,24 letter",
    ]);
  });

  it("läuft zu einem Punkt ohne Leuchtspur und hinterlässt ihn dort", () => {
    const period: Glyph = [{ x: 0, y: 4, marker: "dot" }];
    const trace = traceOnBaselineAt(10, 25);

    appendGlyph(trace, period, 10, 20);

    expect(describeSteps(trace)).toEqual(["10,25 connector", "10,24 silent *"]);
  });

  it("läuft nach einem Punkt ohne Leuchtspur weiter, danach wieder mit Spur", () => {
    const questionMarkStart: Glyph = [
      { x: 1, y: 4, marker: "dot" },
      { x: 1, y: 3 },
      { x: 1, y: 2 },
    ];
    const trace = traceOnBaselineAt(11, 25);

    appendGlyph(trace, questionMarkStart, 10, 20);

    expect(describeSteps(trace)).toEqual([
      "11,25 connector",
      "11,24 silent *",
      "11,23 silent",
      "11,22 letter",
    ]);
  });

  it("springt bei einem Sprung-Wegpunkt ohne Leuchtspur", () => {
    const hyphen: Glyph = [
      { x: 0, y: 4 },
      { x: 0, y: 2, marker: "hop" },
      { x: 2, y: 2 },
      { x: 2, y: 4, marker: "hop" },
    ];
    const trace = traceOnBaselineAt(10, 25);

    appendGlyph(trace, hyphen, 10, 20);

    expect(describeSteps(trace)).toEqual([
      "10,25 connector",
      "10,24 connector",
      "10,23 silent",
      "10,22 silent",
      "11,22 letter",
      "12,22 letter",
      "12,23 silent",
      "12,24 silent",
    ]);
  });
});
