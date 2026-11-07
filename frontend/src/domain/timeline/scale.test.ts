import { describe, expect, it } from "vitest";
import type { Station } from "../cv/stations";
import { layOut, layOutExpanded, pixelsPerYear, sectionsOf, xForYear } from "./scale";

const TODAY = 2026;

function station(id: number, from: number, to = from + 1, section = "beruf"): Station {
  return { id, section, time: String(from), title: `S${String(id)}`, bulletPoints: [], from, to };
}

describe("sectionsOf", () => {
  it("lässt jede Station bis zum Beginn der nächsten reichen, die letzte bis heute", () => {
    const sections = sectionsOf(
      [station(0, 2000), station(1, 2010), station(2, 2020)],
      [50, 60, 70],
      TODAY,
    );

    expect(sections.map(({ from, to, minWidth }) => [from, to, minWidth])).toEqual([
      [2000, 2010, 50],
      [2010, 2020, 60],
      [2020, 2026, 70],
    ]);
  });
});

describe("pixelsPerYear", () => {
  it("füllt die Breite nach der Dauer, wenn jede Station breit genug wird", () => {
    const sections = sectionsOf([station(0, 2000), station(1, 2010)], [10, 10], 2020);

    expect(pixelsPerYear(sections, 400)).toBe(20);
  });

  it("gibt kurzen Stationen ihre Mindestbreite und verteilt den Rest auf die übrigen", () => {
    // 2000–2018 (18 Jahre) und 2018–2020 (2 Jahre, braucht mindestens 100 px): 300 px für 18 Jahre
    const sections = sectionsOf([station(0, 2000), station(1, 2018)], [10, 100], 2020);

    expect(pixelsPerYear(sections, 400)).toBeCloseTo(300 / 18);
  });

  it("bleibt beim letzten Wert, wenn nicht einmal die Mindestbreiten passen", () => {
    const sections = sectionsOf([station(0, 2000), station(1, 2018)], [500, 500], 2020);

    expect(pixelsPerYear(sections, 400)).toBeGreaterThan(0);
  });
});

describe("layOut und xForYear", () => {
  const laid = layOut(sectionsOf([station(0, 2000), station(1, 2010)], [10, 300], 2020), 20);

  it("legt die Abschnitte nebeneinander, keiner schmaler als seine Mindestbreite", () => {
    expect(laid.map(({ x, width }) => [x, width])).toEqual([
      [0, 200],
      [200, 300],
    ]);
  });

  it("findet einen Zeitpunkt anteilig in seinem Abschnitt, auch in einem verbreiterten", () => {
    expect(xForYear(2005, laid)).toBe(100);
    expect(xForYear(2015, laid)).toBe(350);
  });

  it("legt ohne Abschnitte alles an den Anfang", () => {
    expect(xForYear(2000, [])).toBe(0);
  });

  it("legt Zeitpunkte vor dem ersten an den Anfang und nach dem letzten ans Ende", () => {
    expect(xForYear(1990, laid)).toBe(0);
    expect(xForYear(2030, laid)).toBe(500);
  });
});

describe("layOutExpanded", () => {
  const OPTIONS = {
    availableWidth: 800,
    minPixelsPerYear: 34,
    todaySpace: 64,
    labelAir: 12,
    minEngagementWidth: 40,
  };
  const stations = {
    careerStart: 2010,
    mainTrack: [station(0, 2000, 2005, "schule"), station(1, 2010), station(2, 2020)],
    engagements: [station(3, 2012, 2015, "lehre"), station(4, 2022, 2026, "lehre")],
  };

  it("lässt den Beruf die Breite ohne den Platz für „heute“ füllen; was davor war, kommt im selben Maßstab dazu", () => {
    const layout = layOutExpanded(stations, [50, 50, 50], OPTIONS, TODAY);

    // Beruf 2010–2026 = 16 Jahre auf 736 px = 46 px je Jahr; die Schule 2000–2010 davor 460 px
    expect(layout.sections.map(({ x, width }) => [x, width])).toEqual([
      [0, 460],
      [460, 460],
      [920, 276],
    ]);
    expect(layout.lineEnd).toBe(1196);
    expect(layout.contentWidth).toBe(1260);
  });

  it("hält mindestens so viele Pixel je Jahr", () => {
    const narrow = layOutExpanded(
      stations,
      [50, 50, 50],
      { ...OPTIONS, availableWidth: 200 },
      TODAY,
    );

    expect(narrow.sections[0]?.width).toBe(340);
  });

  it("stellt jedes Engagement an seinen Beginn; die Beschriftung reicht bis vor das nächste, das letzte bis zum Ende", () => {
    const layout = layOutExpanded(stations, [50, 50, 50], OPTIONS, TODAY);

    expect(
      layout.engagements.map(({ station: { id }, left, maxLabelWidth }) => [
        id,
        left,
        maxLabelWidth,
      ]),
    ).toEqual([
      [3, 552, 448],
      [4, 1012, 236],
    ]);
  });

  it("gibt einer Beschriftung mindestens 40 px, auch wenn das nächste Engagement sofort folgt", () => {
    const crowded = {
      ...stations,
      engagements: [station(3, 2012, 2013, "lehre"), station(5, 2012.1, 2014, "lehre")],
    };

    expect(
      layOutExpanded(crowded, [50, 50, 50], OPTIONS, TODAY).engagements[0]?.maxLabelWidth,
    ).toBe(40);
  });

  it("kommt ohne Stationen aus", () => {
    expect(
      layOutExpanded({ careerStart: TODAY, mainTrack: [], engagements: [] }, [], OPTIONS, TODAY),
    ).toEqual({
      sections: [],
      lineEnd: 0,
      contentWidth: 64,
      engagements: [],
    });
  });
});
