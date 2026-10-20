import type { Clock } from "./clock";

/**
 * Misst, wie viel Zeit von einem Bild zum nächsten vergangen ist. Eine lange Pause (der Tab war
 * im Hintergrund) wird auf einen längsten Schritt gekürzt, sonst machte die Animation einen
 * Riesensprung.
 */
export class FrameTimer {
  private lastFrameAt: number | undefined;

  public constructor(
    private readonly clock: Clock,
    private readonly longestStepSeconds: number,
  ) {}

  /** Sekunden seit dem vorigen Bild, höchstens der längste Schritt; beim ersten Bild 0. */
  public secondsSinceLastFrame(): number {
    const now = this.clock.now();
    const seconds = this.lastFrameAt === undefined ? 0 : now - this.lastFrameAt;
    this.lastFrameAt = now;
    return Math.min(this.longestStepSeconds, seconds);
  }

  /** Vergisst das vorige Bild: Das nächste meldet wieder 0 Sekunden. */
  public restart(): void {
    this.lastFrameAt = undefined;
  }
}
