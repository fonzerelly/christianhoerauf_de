import { describe, expect, it } from "vitest";
import { yearOfDate } from "./year-of-date";

describe("yearOfDate", () => {
  it("macht aus einem Datum ein Jahr mit Nachkommastellen", () => {
    expect(yearOfDate(new Date(2026, 0, 1))).toBe(2026);
    expect(yearOfDate(new Date(2026, 6, 2, 12))).toBeCloseTo(2026.5, 2);
  });
});
