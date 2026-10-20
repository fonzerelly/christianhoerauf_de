import { describe, expect, it } from "vitest";
import { scrollShiftsOf } from "./scroll-shifts";

describe("scrollShiftsOf", () => {
  it("lässt beide Seiten vor dem Weiterschieben genau eine Rasterbreite auseinander stehen", () => {
    // Der Lichtpunkt hat die alte Seite rechts verlassen: die neue wartet rechts daneben.
    expect(scrollShiftsOf("right", 34, 76, 11, 0)).toEqual({
      outgoing: { x: 0, y: 0 },
      incoming: { x: 374, y: 0 },
    });
  });

  it("schiebt in die Richtung, in die der Lichtpunkt gelaufen ist: die alte Seite weicht entgegengesetzt", () => {
    expect(scrollShiftsOf("right", 34, 76, 11, 0.5)).toEqual({
      outgoing: { x: -187, y: 0 },
      incoming: { x: 187, y: 0 },
    });
    expect(scrollShiftsOf("bottom", 34, 76, 11, 0.5)).toEqual({
      outgoing: { x: 0, y: -418 },
      incoming: { x: 0, y: 418 },
    });
    expect(scrollShiftsOf("top", 34, 76, 11, 1)).toEqual({
      outgoing: { x: 0, y: 836 },
      incoming: { x: 0, y: 0 },
    });
    expect(scrollShiftsOf("left", 34, 76, 11, 1)).toEqual({
      outgoing: { x: 374, y: 0 },
      incoming: { x: 0, y: 0 },
    });
  });

  it("rundet auf ganze Pixel, damit die Wände beim Schieben nicht flimmern", () => {
    const { outgoing } = scrollShiftsOf("right", 34, 76, 11, 0.3333);

    expect(outgoing.x).toBe(-125);
  });
});
