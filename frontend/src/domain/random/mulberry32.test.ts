import { describe, expect, it } from "vitest";
import { Mulberry32 } from "./mulberry32";

describe("Mulberry32", () => {
  it("liefert für Startwert 1 die bekannte Zahlenfolge des Prototyps", () => {
    const random = new Mulberry32(1);

    const firstNumbers = [random.next(), random.next(), random.next()];

    expect(firstNumbers).toEqual([0.6270739405881613, 0.002735721180215478, 0.5274470399599522]);
  });

  it("liefert bei gleichem Startwert dieselbe Folge", () => {
    const first = new Mulberry32(42);
    const second = new Mulberry32(42);

    expect([first.next(), first.next()]).toEqual([second.next(), second.next()]);
  });

  it("liefert nur Zahlen von 0 (eingeschlossen) bis 1 (ausgeschlossen)", () => {
    const random = new Mulberry32(7);

    for (let draw = 0; draw < 1000; draw++) {
      const value = random.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it("behandelt den Startwert als vorzeichenlose 32-Bit-Zahl", () => {
    expect(new Mulberry32(2 ** 32 + 5).next()).toBe(new Mulberry32(5).next());
  });
});
