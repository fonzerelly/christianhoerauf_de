import { describe, expect, it } from "vitest";
import type { RandomSource } from "../domain/random/random-source";
import { scriptedRandom } from "../test-support/scripted-random";
import { GlitchScheduler } from "./glitch-scheduler";

const VIEW_HEIGHT = 100;
/** 60 Störungen pro Minute: in einer halben Sekunde beginnt eine mit der Wahrscheinlichkeit 0,5. */
const PER_MINUTE = 60;

/** Eine Zufallsquelle, die mitzählt, wie oft sie gefragt wurde. */
function countingRandom(...values: number[]): RandomSource & { asked: () => number } {
  const source = scriptedRandom(...values);
  let asked = 0;
  return {
    next: () => {
      asked++;
      return source.next();
    },
    asked: () => asked,
  };
}

describe("GlitchScheduler", () => {
  it("beginnt keine Störung, wenn die Würfel nicht reichen", () => {
    const scheduler = new GlitchScheduler(scriptedRandom(0.5));

    scheduler.advance(0.5, true, PER_MINUTE, VIEW_HEIGHT);

    expect(scheduler.current).toBeUndefined();
  });

  it("beginnt eine Störung mit zufälliger Dauer und Balkenhöhe, wenn die Würfel reichen", () => {
    // Wurf 1: 0,1 < 0,5 => Beginn. Dauer: 0,35 + 0,5 * 0,5 = 0,6 s. Balkenhöhe: (0,08 + 0,5 * 0,17) * 100 = 16,5.
    const scheduler = new GlitchScheduler(scriptedRandom(0.1, 0.5, 0.5));

    scheduler.advance(0.5, true, PER_MINUTE, VIEW_HEIGHT);

    expect(scheduler.current?.part).toBe(0);
    expect(scheduler.current?.bandHeight).toBeCloseTo(16.5);
  });

  it("lässt die Störung von oben nach unten durchs Bild laufen und beendet sie nach ihrer Dauer", () => {
    const scheduler = new GlitchScheduler(scriptedRandom(0.1, 0.5, 0));
    scheduler.advance(0.5, true, PER_MINUTE, VIEW_HEIGHT);

    scheduler.advance(0.3, true, PER_MINUTE, VIEW_HEIGHT);
    expect(scheduler.current?.part).toBeCloseTo(0.5);

    scheduler.advance(0.3, true, PER_MINUTE, VIEW_HEIGHT);
    expect(scheduler.current).toBeUndefined();
  });

  it("beginnt keine Störung, solange die Animation steht, und würfelt dann auch nicht", () => {
    const random = countingRandom(0.1, 0.5, 0.5);
    const scheduler = new GlitchScheduler(random);

    scheduler.advance(0.5, false, PER_MINUTE, VIEW_HEIGHT);

    expect(scheduler.current).toBeUndefined();
    expect(random.asked()).toBe(0);
  });

  it("beginnt keine zweite Störung, solange eine läuft, und würfelt dann auch nicht", () => {
    const random = countingRandom(0.1, 0.5, 0.5, 0.1, 0.5, 0.5);
    const scheduler = new GlitchScheduler(random);
    scheduler.advance(0.5, true, PER_MINUTE, VIEW_HEIGHT);
    expect(random.asked()).toBe(3);

    scheduler.advance(0.1, true, PER_MINUTE, VIEW_HEIGHT);

    expect(random.asked()).toBe(3);
  });

  it("beginnt nie eine Störung bei 0 Störungen pro Minute", () => {
    const scheduler = new GlitchScheduler(scriptedRandom(0));

    scheduler.advance(10, true, 0, VIEW_HEIGHT);

    expect(scheduler.current).toBeUndefined();
  });

  it("vergisst die laufende Störung, wenn man es verlangt", () => {
    const scheduler = new GlitchScheduler(scriptedRandom(0.1, 0.5, 0.5));
    scheduler.advance(0.5, true, PER_MINUTE, VIEW_HEIGHT);

    scheduler.stop();

    expect(scheduler.current).toBeUndefined();
  });
});
