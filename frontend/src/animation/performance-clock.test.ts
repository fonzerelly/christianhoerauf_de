import { describe, expect, it } from "vitest";
import { PerformanceClock } from "./performance-clock";

describe("PerformanceClock", () => {
  it("rechnet die Millisekunden der Quelle in Sekunden um", () => {
    let millis = 2500;
    const clock = new PerformanceClock(() => millis);

    expect(clock.now()).toBe(2.5);
    millis = 4000;
    expect(clock.now()).toBe(4);
  });
});
