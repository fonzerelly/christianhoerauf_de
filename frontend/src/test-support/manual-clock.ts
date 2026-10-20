import type { Clock } from "../animation/clock";

/** Eine Uhr für Tests: Sie steht still, bis man sie mit `advance` weiterstellt. */
export class ManualClock implements Clock {
  private seconds = 0;

  public now(): number {
    return this.seconds;
  }

  public advance(seconds: number): void {
    this.seconds += seconds;
  }
}
