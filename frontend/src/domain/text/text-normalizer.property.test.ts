import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { createDefaultFont, REPLACEMENT_CHARACTER } from "../font/font";
import { BREAK_MARK } from "./break-marks";
import { TextNormalizer } from "./text-normalizer";

const font = createDefaultFont();
const normalizer = new TextNormalizer(font, () => undefined);
const segmenter = new Intl.Segmenter();

/** Beliebiger Unicode-Text, auch mit einzelnen Surrogaten, Steuerzeichen und Emoji-Folgen. */
const anyText = fc.oneof(
  fc.string({ unit: "binary", maxLength: 40 }),
  fc.string({ unit: "grapheme", maxLength: 40 }),
  fc.string({ unit: fc.constantFrom("a", "Ä", "é", "ß", "|", ",", " ", "€", "́", "‍", "😀") }),
);

const drawableCharacters = Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ0123456789-.?!█");
const unknownGraphemes = ["€", "日", "😀", "👨‍👩‍👧", "@", "ø", "_", "\u00a9"];

/** Zeichen, die als sichtbare Glyphe im Ergebnis stehen (also weder Leerzeichen noch Trennstelle). */
function glyphCount(text: string): number {
  return Array.from(text).filter((character) => character !== " " && character !== BREAK_MARK)
    .length;
}

/** Wie viele Grapheme des Textes ein Mensch als sichtbares Zeichen sieht, das nicht Trenner ist. */
function visibleGraphemeCount(text: string): number {
  const invisible = /^[\p{White_Space}\p{Cc}\p{Cf}]+$/u;
  return [...segmenter.segment(text)].filter(
    ({ segment }) => !invisible.test(segment) && ![",", ";", ":", BREAK_MARK].includes(segment),
  ).length;
}

describe("TextNormalizer (Eigenschaften)", () => {
  it("liefert nur darstellbare Zeichen, Leerzeichen und Trennstellen", () => {
    fc.assert(
      fc.property(anyText, (text) => {
        const result = normalizer.normalize(text);
        for (const character of result) {
          expect(character === " " || character === BREAK_MARK || font.hasGlyph(character)).toBe(
            true,
          );
        }
      }),
      { numRuns: 2000 },
    );
  });

  it("lässt kein sichtbares Zeichen verschwinden", () => {
    fc.assert(
      fc.property(anyText, (text) => {
        expect(glyphCount(normalizer.normalize(text))).toBeGreaterThanOrEqual(
          Math.max(1, visibleGraphemeCount(text)),
        );
      }),
      { numRuns: 2000 },
    );
  });

  it("macht aus einem unbekannten Graphem genau eine Ersatzglyphe", () => {
    fc.assert(
      fc.property(fc.constantFrom(...unknownGraphemes), (grapheme) => {
        expect(normalizer.normalize(`A ${grapheme} B`)).toBe(`A ${REPLACEMENT_CHARACTER} B`);
      }),
    );
  });

  it("lässt darstellbare Zeichen unverändert", () => {
    const word = fc
      .array(fc.constantFrom(...drawableCharacters), { minLength: 1, maxLength: 8 })
      .map((c) => c.join(""));
    fc.assert(
      fc.property(fc.array(word, { minLength: 1, maxLength: 6 }), (words) => {
        const text = words.join(" ");
        expect(normalizer.normalize(text)).toBe(text);
      }),
    );
  });

  it("ergibt beim zweiten Aufbereiten dasselbe wie beim ersten", () => {
    fc.assert(
      fc.property(anyText, (text) => {
        const once = normalizer.normalize(text);
        expect(normalizer.normalize(once)).toBe(once);
      }),
      { numRuns: 2000 },
    );
  });

  it("wirft bei keinem Text", () => {
    fc.assert(
      fc.property(anyText, (text) => typeof normalizer.normalize(text) === "string"),
      { numRuns: 2000 },
    );
  });

  it("zerlegt Text aus einfachen Zeichen ohne Zerleger genauso wie der Zerleger", () => {
    const simpleText = fc.stringMatching(/^[\u0020-\u007e\u00c0-\u00ff]{0,40}$/);
    fc.assert(
      fc.property(simpleText, (text) => {
        expect(Array.from(text)).toEqual(
          [...segmenter.segment(text)].map(({ segment }) => segment),
        );
      }),
      { numRuns: 2000 },
    );
  });
});
