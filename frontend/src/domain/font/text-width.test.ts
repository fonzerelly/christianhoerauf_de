import { describe, expect, it } from "vitest";
import { REPLACEMENT_CHARACTER } from "./font";
import { glyphWidthOf, widthInCharacters } from "./text-width";

describe("widthInCharacters", () => {
  it("zählt jedes gewöhnliche Zeichen einfach, auch Leerzeichen und Trennstrich", () => {
    expect(widthInCharacters("AB 1-")).toBe(5);
  });

  it("zählt die Ersatzglyphe doppelt, weil sie so breit ist wie zwei Zeichen", () => {
    expect(widthInCharacters(`A${REPLACEMENT_CHARACTER}B`)).toBe(4);
  });

  it("misst einen leeren Text mit 0", () => {
    expect(widthInCharacters("")).toBe(0);
  });
});

describe("glyphWidthOf", () => {
  it("misst gewöhnliche Glyphen mit 3 Zellen", () => {
    expect(glyphWidthOf("A")).toBe(3);
  });

  it("misst die Ersatzglyphe mit 7 Zellen: zwei Zeichen samt der Lücke dazwischen", () => {
    expect(glyphWidthOf(REPLACEMENT_CHARACTER)).toBe(7);
  });
});
