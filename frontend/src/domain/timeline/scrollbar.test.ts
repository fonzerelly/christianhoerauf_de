import { describe, expect, it } from "vitest";
import { overflows, scrollLeftForThumbDrag, scrollLeftForTrackClick, thumbOf } from "./scrollbar";

// Inhalt 2000 px, sichtbar 500 px, Bahn 400 px: Griff 100 px, wandert 300 px, Inhalt 1500 px weit.
const VIEW = { scrollWidth: 2000, clientWidth: 500, trackWidth: 400 };

describe("thumbOf", () => {
  it("ist so breit wie der sichtbare Anteil der Bahn und steht anteilig", () => {
    expect(thumbOf({ ...VIEW, scrollLeft: 0 })).toEqual({ width: 100, left: 0 });
    expect(thumbOf({ ...VIEW, scrollLeft: 750 })).toEqual({ width: 100, left: 150 });
    expect(thumbOf({ ...VIEW, scrollLeft: 1500 })).toEqual({ width: 100, left: 300 });
  });

  it("wird nie schmaler als 24 px", () => {
    expect(
      thumbOf({ scrollWidth: 100_000, clientWidth: 500, trackWidth: 400, scrollLeft: 0 }).width,
    ).toBe(24);
  });

  it("füllt die Bahn, wenn nichts zu verschieben ist", () => {
    expect(thumbOf({ scrollWidth: 500, clientWidth: 500, trackWidth: 400, scrollLeft: 0 })).toEqual(
      {
        width: 400,
        left: 0,
      },
    );
  });
});

describe("scrollLeftForThumbDrag", () => {
  it("verschiebt den Inhalt im Verhältnis von Inhaltsweg zu Griffweg", () => {
    expect(scrollLeftForThumbDrag(0, 30, VIEW)).toBe(150);
    expect(scrollLeftForThumbDrag(750, -60, VIEW)).toBe(450);
  });
});

describe("scrollLeftForTrackClick", () => {
  it("setzt den Griff mit seiner Mitte an die Stelle des Klicks", () => {
    expect(scrollLeftForTrackClick(200, VIEW)).toBe(750);
    expect(scrollLeftForTrackClick(50, VIEW)).toBe(0);
  });
});

describe("overflows", () => {
  it("ist der Inhalt breiter als der sichtbare Bereich (mehr als 1 px)?", () => {
    expect(overflows(2000, 500)).toBe(true);
    expect(overflows(501, 500)).toBe(false);
  });
});
