import type { RandomSource } from "../domain/random/random-source";

/** Eine laufende Bildstörung. */
export interface Glitch {
  /** Wie weit der Störbalken ist, von 0 (oben, noch außerhalb des Bildes) bis 1 (unten hinaus). */
  readonly part: number;
  /** Höhe des Störbalkens in Pixeln. */
  readonly bandHeight: number;
}

/** Eine Störung dauert mindestens so lange und höchstens so viel länger (Sekunden). */
const SHORTEST_GLITCH_SECONDS = 0.35;
const GLITCH_SECONDS_RANGE = 0.5;
/** Der Störbalken ist mindestens so hoch und höchstens so viel höher (Anteil der Bildhöhe). */
const THINNEST_BAND = 0.08;
const BAND_RANGE = 0.17;

interface RunningGlitch {
  readonly seconds: number;
  readonly bandHeight: number;
  elapsed: number;
}

/**
 * Würfelt aus, wann eine Bildstörung beginnt: ein Störbalken, der einmal von oben nach unten
 * durchs Bild läuft. Zufall kommt von außen, damit Bildtests dieselbe Störung sehen.
 */
export class GlitchScheduler {
  private running: RunningGlitch | undefined;

  public constructor(private readonly random: RandomSource) {}

  /** Die laufende Störung, falls es eine gibt. */
  public get current(): Glitch | undefined {
    if (this.running === undefined) return undefined;
    return {
      part: this.running.elapsed / this.running.seconds,
      bandHeight: this.running.bandHeight,
    };
  }

  /**
   * Lässt `seconds` vergehen: Eine laufende Störung rückt vor oder endet, sonst beginnt mit der
   * Wahrscheinlichkeit `perMinute / 60 * seconds` eine neue - aber nur, solange die Animation läuft.
   */
  public advance(
    seconds: number,
    isAnimationRunning: boolean,
    perMinute: number,
    viewHeight: number,
  ): void {
    if (this.running !== undefined) {
      this.running.elapsed += seconds;
      if (this.running.elapsed >= this.running.seconds) this.running = undefined;
      return;
    }

    const chance = (perMinute / 60) * seconds;
    if (isAnimationRunning && this.random.next() < chance) {
      this.running = {
        seconds: SHORTEST_GLITCH_SECONDS + this.random.next() * GLITCH_SECONDS_RANGE,
        bandHeight: (THINNEST_BAND + this.random.next() * BAND_RANGE) * viewHeight,
        elapsed: 0,
      };
    }
  }

  /** Beendet die laufende Störung sofort. */
  public stop(): void {
    this.running = undefined;
  }
}
