import { describe, expect, it } from "vitest";
import { BRIGHTNESS_LEVELS, Trail } from "./trail";

const HOLD_SECONDS = 0.5;
const FADE_SECONDS = 1;

function trailWalkedAt(clock: number, firstStep: number, lastStep: number): Trail {
  const trail = new Trail({ holdSeconds: HOLD_SECONDS, fadeSeconds: FADE_SECONDS });
  trail.markWalked(firstStep - 1, lastStep, clock);
  return trail;
}

describe("Trail", () => {
  describe("levelOf", () => {
    it("zeigt ein Wegstück, das der Lichtpunkt noch läuft, in voller Helligkeit", () => {
      const trail = new Trail({ holdSeconds: HOLD_SECONDS, fadeSeconds: FADE_SECONDS });

      expect(trail.levelOf(3, 100)).toBe(BRIGHTNESS_LEVELS);
    });

    it("lässt ein gelaufenes Wegstück zuerst voll leuchten", () => {
      const trail = trailWalkedAt(10, 1, 1);

      expect(trail.levelOf(1, 10)).toBe(BRIGHTNESS_LEVELS);
      expect(trail.levelOf(1, 10 + HOLD_SECONDS)).toBe(BRIGHTNESS_LEVELS);
    });

    it("blendet es danach gleichmäßig aus, in Stufen aufgerundet", () => {
      const trail = trailWalkedAt(10, 1, 1);

      expect(trail.levelOf(1, 10 + HOLD_SECONDS + FADE_SECONDS / 2)).toBe(8);
      expect(trail.levelOf(1, 10 + HOLD_SECONDS + FADE_SECONDS / 4)).toBe(12);
      expect(trail.levelOf(1, 10 + HOLD_SECONDS + FADE_SECONDS / 32)).toBe(16);
    });

    it("lässt es ganz verglimmen und danach dunkel bleiben", () => {
      const trail = trailWalkedAt(10, 1, 1);

      expect(trail.levelOf(1, 10 + HOLD_SECONDS + FADE_SECONDS)).toBe(0);
      expect(trail.levelOf(1, 99)).toBe(0);
    });

    it("lässt das Wegstück ohne Ausblenden (fadeSeconds 0) nach der Leuchtdauer sofort dunkel werden", () => {
      const trail = new Trail({ holdSeconds: HOLD_SECONDS, fadeSeconds: 0 });
      trail.markWalked(0, 1, 10);

      expect(trail.levelOf(1, 10 + HOLD_SECONDS)).toBe(BRIGHTNESS_LEVELS);
      expect(trail.levelOf(1, 10 + HOLD_SECONDS + 0.001)).toBe(0);
    });
  });

  describe("markWalked", () => {
    it("merkt sich für jedes seither fertig gelaufene Wegstück dieselbe Uhrzeit", () => {
      const trail = new Trail({ holdSeconds: HOLD_SECONDS, fadeSeconds: FADE_SECONDS });
      trail.markWalked(0, 3, 10);
      trail.markWalked(3, 4, 20);

      const clock = 10 + HOLD_SECONDS + FADE_SECONDS / 2;
      expect([1, 2, 3].map((step) => trail.levelOf(step, clock))).toEqual([8, 8, 8]);
      expect(trail.levelOf(4, 20)).toBe(BRIGHTNESS_LEVELS);
      expect(trail.levelOf(5, clock)).toBe(BRIGHTNESS_LEVELS);
    });

    it("tut nichts, wenn kein Wegstück dazugekommen ist", () => {
      const trail = new Trail({ holdSeconds: HOLD_SECONDS, fadeSeconds: FADE_SECONDS });
      trail.markWalked(2, 2, 10);

      expect(trail.levelOf(2, 99)).toBe(BRIGHTNESS_LEVELS);
    });
  });

  describe("firstGlowingStep", () => {
    it("beginnt bei Wegstück 1, solange nichts verglommen ist", () => {
      const trail = trailWalkedAt(10, 1, 4);

      expect(trail.firstGlowingStep(4, 10 + HOLD_SECONDS + FADE_SECONDS)).toBe(1);
    });

    it("überspringt die Wegstücke, die ganz verglommen sind", () => {
      const trail = new Trail({ holdSeconds: HOLD_SECONDS, fadeSeconds: FADE_SECONDS });
      trail.markWalked(0, 2, 10);
      trail.markWalked(2, 4, 11);

      expect(trail.firstGlowingStep(4, 11.6)).toBe(3);
    });

    it("liefert den Schritt hinter dem letzten gelaufenen, wenn alles verglommen ist", () => {
      const trail = trailWalkedAt(10, 1, 4);

      expect(trail.firstGlowingStep(4, 99)).toBe(5);
    });

    it("hält ein Wegstück, dessen Uhrzeit nicht vermerkt wurde, für noch leuchtend", () => {
      const trail = new Trail({ holdSeconds: 1, fadeSeconds: 1 });

      expect(trail.firstGlowingStep(3, 99)).toBe(1);
    });

    it("liefert 1, wenn noch nichts gelaufen ist", () => {
      expect(new Trail({ holdSeconds: 1, fadeSeconds: 1 }).firstGlowingStep(0, 5)).toBe(1);
    });
  });

  describe("reset", () => {
    it("vergisst alles: ein neues Labyrinth hat keine Leuchtspur", () => {
      const trail = trailWalkedAt(10, 1, 4);

      trail.reset();

      expect(trail.levelOf(1, 99)).toBe(BRIGHTNESS_LEVELS);
    });
  });
});
