import { describe, expect, it } from "vitest";
import { pulseOf } from "./pulse";

describe("pulseOf", () => {
  it("beginnt hell, wird in der halben Dauer ganz dunkel und ist nach einer Dauer wieder hell", () => {
    expect(pulseOf(0, 2)).toBeCloseTo(1);
    expect(pulseOf(1, 2)).toBeCloseTo(0);
    expect(pulseOf(2, 2)).toBeCloseTo(1);
  });

  it("liegt nach einer Viertel-Dauer in der Mitte", () => {
    expect(pulseOf(0.5, 2)).toBeCloseTo(0.5);
  });

  it("wiederholt sich: nach mehreren Dauern ist es wie am Anfang", () => {
    expect(pulseOf(7, 2)).toBeCloseTo(pulseOf(1, 2));
  });
});
