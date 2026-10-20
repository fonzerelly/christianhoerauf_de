import { describe, expect, it } from "vitest";
import { playbackView } from "./fake-playback-view";

describe("playbackView", () => {
  it("steht ohne Angaben still: nichts zu zeichnen, kein Lichtpunkt", () => {
    const view = playbackView({});

    expect(view.isAnimating).toBe(false);
    expect(view.isScrolling).toBe(false);
    expect(view.isResting).toBe(false);
    expect(view.isDotVisible).toBe(false);
    expect(view.currentPage).toBeUndefined();
    expect(view.nextPage).toBeUndefined();
    expect(view.progress).toBe(0);
    expect(view.scrollPart).toBe(0);
    expect(view.restingPulse).toBe(0);
    expect(view.dotPosition()).toBeUndefined();
    expect(view.firstGlowingStep()).toBe(1);
    expect(view.trailLevelOf(3)).toBe(16);
  });

  it("nimmt die genannten Werte", () => {
    const view = playbackView({
      isAnimating: true,
      progress: 2.5,
      scrollPart: 0.5,
      firstGlowingStep: 2,
      levelOfStep: (step) => step,
      dot: { x: 1, y: 2 },
    });

    expect(view).toMatchObject({ isAnimating: true, progress: 2.5, scrollPart: 0.5 });
    expect(view.firstGlowingStep()).toBe(2);
    expect(view.trailLevelOf(7)).toBe(7);
    expect(view.dotPosition()).toEqual({ x: 1, y: 2 });
  });
});
