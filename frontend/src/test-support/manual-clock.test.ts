import { describe, expect, it } from "vitest";
import { ManualClock } from "./manual-clock";

describe("ManualClock", () => {
  it("beginnt bei 0", () => {
    expect(new ManualClock().now()).toBe(0);
  });

  it("läuft nur weiter, wenn man sie weiterstellt", () => {
    const clock = new ManualClock();

    clock.advance(1.5);
    clock.advance(0.25);

    expect(clock.now()).toBe(1.75);
  });
});
