import type { Clock } from "./clock";

/** Die Uhr des Browsers: ihre Quelle liefert Millisekunden (im Browser `performance.now()`). */
export class PerformanceClock implements Clock {
  public constructor(private readonly readMillis: () => number) {}

  public now(): number {
    return this.readMillis() / 1000;
  }
}
