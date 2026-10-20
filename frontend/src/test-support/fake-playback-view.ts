import type { Phase, PlaybackView } from "../animation/playback-view";
import { BRIGHTNESS_LEVELS } from "../animation/trail";
import type { Position } from "../domain/maze/position";
import type { MazePage } from "../domain/pages/maze-page-generator";

/**
 * Eine Attrappe für den Ablauf der Animation, wie der Renderer ihn sieht. Ohne Angaben steht
 * alles still; die Leuchtspur leuchtet überall voll, das erste leuchtende Wegstück ist 1.
 */
export function playbackView(values: {
  phase?: Phase;
  isAnimating?: boolean;
  isScrolling?: boolean;
  isResting?: boolean;
  isDotVisible?: boolean;
  currentPage?: MazePage;
  nextPage?: MazePage;
  progress?: number;
  scrollPart?: number;
  restingPulse?: number;
  dot?: Position;
  firstGlowingStep?: number;
  levelOfStep?: (step: number) => number;
}): PlaybackView {
  return {
    phase: values.phase ?? "waiting",
    isAnimating: values.isAnimating ?? false,
    isScrolling: values.isScrolling ?? false,
    isResting: values.isResting ?? false,
    isDotVisible: values.isDotVisible ?? false,
    currentPage: values.currentPage,
    nextPage: values.nextPage,
    progress: values.progress ?? 0,
    scrollPart: values.scrollPart ?? 0,
    restingPulse: values.restingPulse ?? 0,
    dotPosition: () => values.dot,
    trailLevelOf: values.levelOfStep ?? (() => BRIGHTNESS_LEVELS),
    firstGlowingStep: () => values.firstGlowingStep ?? 1,
  };
}
