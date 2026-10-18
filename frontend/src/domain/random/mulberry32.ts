import type { RandomSource } from "./random-source";

/** Zufallsgenerator mit Startwert (Mulberry32): gleicher Startwert, gleiche Zahlenfolge. */
export class Mulberry32 implements RandomSource {
  private state: number;

  public constructor(seed: number) {
    this.state = seed >>> 0;
  }

  public next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    // Die Bit-Operationen sind der Algorithmus selbst und lassen sich nicht lesbarer fassen.
    // Sie müssen genau so bleiben, damit die Zahlenfolge der des Prototyps entspricht.
    let mixed = this.state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  }
}
