import { describe, expect, it } from "vitest";
import { BREAK_MARK, readBreakMarks, withoutBreakMarks } from "./break-marks";

describe("withoutBreakMarks", () => {
  it("entfernt alle Trennstellen", () => {
    expect(withoutBreakMarks("PRO|TO|TYP")).toBe("PROTOTYP");
  });

  it("lässt einen Text ohne Trennstellen unverändert", () => {
    expect(withoutBreakMarks("PROTOTYP")).toBe("PROTOTYP");
  });
});

describe("readBreakMarks", () => {
  it("liefert die Buchstaben ohne Trennstellen und die Stellen, vor denen getrennt werden darf", () => {
    expect(readBreakMarks("PRO|TO|TYP")).toEqual({ letters: "PROTOTYP", breakPositions: [3, 5] });
  });

  it("liefert für ein Wort ohne Trennstellen eine leere Liste", () => {
    expect(readBreakMarks("PROTOTYP")).toEqual({ letters: "PROTOTYP", breakPositions: [] });
  });

  it("zählt aufeinanderfolgende Trennstellen an derselben Stelle doppelt", () => {
    expect(readBreakMarks(`A${BREAK_MARK}${BREAK_MARK}B`).breakPositions).toEqual([1, 1]);
  });
});
