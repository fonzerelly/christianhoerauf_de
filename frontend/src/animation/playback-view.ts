import type { Position } from "../domain/maze/position";
import type { MazePage } from "../domain/pages/maze-page-generator";

/**
 * Was der Renderer vom Ablauf der Animation sieht: nur Lesezugriffe. `AnswerPlayback` erfüllt
 * diese Schnittstelle; im Test des Renderers steht eine Attrappe dafür.
 */
export interface PlaybackView {
  /** Hat die Animation gerade etwas zu zeigen oder zu bewegen? Im Stillstand (`waiting`) nicht. */
  readonly isAnimating: boolean;
  /** Schiebt das Bild gerade zur nächsten Seite weiter? */
  readonly isScrolling: boolean;
  /** Die Seite, auf der der Lichtpunkt ist; `undefined`, solange noch nichts geschrieben wird. */
  readonly currentPage: MazePage | undefined;
  /** Die Seite danach; beim Weiterschieben schon zu sehen. */
  readonly nextPage: MazePage | undefined;
  /** Wie viele Wegstücke der Lichtpunkt auf der aktuellen Seite gelaufen ist, mit Nachkommastellen. */
  readonly progress: number;
  /** Ist der Lichtpunkt zu sehen? */
  readonly isDotVisible: boolean;
  /** Wie weit das Weiterschieben ist, von 0 bis 1. */
  readonly scrollPart: number;
  /** Wie hell der wartende Lichtpunkt pulsiert, von 0 bis 1; außerhalb des Wartens 0. */
  readonly restingPulse: number;
  /** Wartet der Lichtpunkt am Haltepunkt? */
  readonly isResting: boolean;
  /** Wo der Lichtpunkt steht, auch zwischen zwei Zellen. */
  dotPosition(): Position | undefined;
  /** Helligkeitsstufe der Leuchtspur auf dem Wegstück (0 bis 16). */
  trailLevelOf(step: number): number;
  /** Das erste Wegstück der aktuellen Seite, das noch leuchtet. */
  firstGlowingStep(): number;
}
