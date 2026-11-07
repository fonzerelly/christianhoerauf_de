import { describe, expect, it } from "vitest";
import { timeSpanOf, yearOf } from "./time-span";

const TODAY = 2026.85;

describe("yearOf", () => {
  it("liest Monat und Jahr: Beginn am Monatsanfang, Ende am Monatsende", () => {
    expect(yearOf("10/2020", "start", TODAY)).toBeCloseTo(2020 + 9 / 12);
    expect(yearOf("10/2020", "end", TODAY)).toBeCloseTo(2020 + 10 / 12);
    expect(yearOf("1/2011", "start", TODAY)).toBe(2011);
  });

  it("legt ein Ende ohne Monat auf die Jahresmitte, einen Beginn auf den Jahresanfang", () => {
    expect(yearOf("2014", "start", TODAY)).toBe(2014);
    expect(yearOf("2014", "end", TODAY)).toBe(2014.5);
  });

  it("nimmt für „heute“ das heutige Datum", () => {
    expect(yearOf("heute", "end", TODAY)).toBe(TODAY);
  });

  it("liefert nichts für Unlesbares", () => {
    expect(yearOf("Sommer", "start", TODAY)).toBeUndefined();
    expect(yearOf("13/2020", "start", TODAY)).toBeUndefined();
  });
});

describe("timeSpanOf", () => {
  it.each([
    ["2011 – 2014", { from: 2011, to: 2014.5 }],
    ["2011-2014", { from: 2011, to: 2014.5 }],
    ["2014", { from: 2014, to: 2014.5 }],
    ["10/2020 – heute", { from: 2020 + 9 / 12, to: TODAY }],
  ])("liest „%s“", (text, expected) => {
    const span = timeSpanOf(text, TODAY);

    expect(span?.from).toBeCloseTo(expected.from);
    expect(span?.to).toBeCloseTo(expected.to);
  });

  it("liefert nichts, wenn Beginn oder Ende unlesbar ist", () => {
    expect(timeSpanOf("2011 – irgendwann", TODAY)).toBeUndefined();
    expect(timeSpanOf("", TODAY)).toBeUndefined();
  });
});
