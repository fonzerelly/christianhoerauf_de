import { describe, expect, it } from "vitest";
import { integerBetween, pickOne, shuffle } from "./random-choices";
import type { RandomSource } from "./random-source";

/** Eine Zufallsquelle, die der Reihe nach vorgegebene Zahlen liefert. */
function randomReturning(...values: number[]): RandomSource {
  let index = 0;
  return {
    next: () => {
      const value = values[index] ?? 0;
      index++;
      return value;
    },
  };
}

describe("pickOne", () => {
  it("wählt das Element an der Stelle floor(Zufallszahl * Länge)", () => {
    expect(pickOne(["a", "b", "c", "d"], randomReturning(0.6))).toBe("c");
  });

  it("wählt bei einer Zufallszahl knapp unter 1 das letzte Element", () => {
    expect(pickOne(["a", "b", "c"], randomReturning(0.9999))).toBe("c");
  });
});

describe("integerBetween", () => {
  it("liefert den kleinsten Wert bei Zufallszahl 0", () => {
    expect(integerBetween(3, 7, randomReturning(0))).toBe(3);
  });

  it("liefert den größten Wert bei einer Zufallszahl knapp unter 1", () => {
    expect(integerBetween(3, 7, randomReturning(0.9999))).toBe(7);
  });
});

describe("shuffle", () => {
  it("tauscht von hinten nach vorn mit dem Element an der gezogenen Stelle", () => {
    // i = 2: j = floor(0.99 * 3) = 2 (bleibt), i = 1: j = floor(0 * 2) = 0 (tauscht)
    expect(shuffle(["a", "b", "c"], randomReturning(0.99, 0))).toEqual(["b", "a", "c"]);
  });

  it("verändert die übergebene Liste und gibt sie zurück", () => {
    const list = [1, 2];

    const result = shuffle(list, randomReturning(0));

    expect(result).toBe(list);
    expect(list).toEqual([2, 1]);
  });

  it("lässt eine Liste mit einem Element unberührt und zieht keine Zahl", () => {
    expect(shuffle(["a"], randomReturning())).toEqual(["a"]);
  });
});

describe("pickOne bei leerer Liste", () => {
  it("wirft, statt undefined zu liefern", () => {
    expect(() => pickOne([], randomReturning(0.5))).toThrow(RangeError);
  });
});
