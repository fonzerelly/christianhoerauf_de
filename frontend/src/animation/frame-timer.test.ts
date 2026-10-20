import { describe, expect, it } from "vitest";
import { ManualClock } from "../test-support/manual-clock";
import { FrameTimer } from "./frame-timer";

const LONGEST_STEP = 0.1;

describe("FrameTimer", () => {
  it("meldet beim ersten Bild 0 Sekunden, weil es noch kein voriges gibt", () => {
    const timer = new FrameTimer(new ManualClock(), LONGEST_STEP);

    expect(timer.secondsSinceLastFrame()).toBe(0);
  });

  it("meldet danach die Zeit seit dem vorigen Bild", () => {
    const clock = new ManualClock();
    const timer = new FrameTimer(clock, LONGEST_STEP);
    timer.secondsSinceLastFrame();

    clock.advance(0.0625);

    expect(timer.secondsSinceLastFrame()).toBe(0.0625);
    clock.advance(0.03125);
    expect(timer.secondsSinceLastFrame()).toBe(0.03125);
  });

  it("kürzt eine lange Pause (etwa wenn der Tab im Hintergrund war) auf den längsten Schritt", () => {
    const clock = new ManualClock();
    const timer = new FrameTimer(clock, LONGEST_STEP);
    timer.secondsSinceLastFrame();

    clock.advance(30);

    expect(timer.secondsSinceLastFrame()).toBe(LONGEST_STEP);
  });

  it("beginnt nach restart() wieder bei 0, damit die Pause nicht zählt", () => {
    const clock = new ManualClock();
    const timer = new FrameTimer(clock, LONGEST_STEP);
    timer.secondsSinceLastFrame();
    clock.advance(0.0625);

    timer.restart();

    expect(timer.secondsSinceLastFrame()).toBe(0);
  });
});
