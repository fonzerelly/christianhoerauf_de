import type { RandomSource } from "../domain/random/random-source";

/**
 * Eine Zufallsquelle für Tests, die der Reihe nach vorgegebene Zahlen liefert. Sind sie
 * aufgebraucht, liefert sie 0.
 */
export function scriptedRandom(...values: number[]): RandomSource {
  let index = 0;
  return {
    next: () => {
      const value = values[index] ?? 0;
      index++;
      return value;
    },
  };
}
