// Golden Master Text: Schrift, Aufbereitung und Zeilenumbruch liefern dasselbe wie der Prototyp.
//
// Der Prototyp kennt weder "!" noch die Ersatzglyphe noch Akzentbuchstaben (er wirft sie
// weg). Die Texte hier enthalten deshalb nur Zeichen, die beide Fassungen gleich behandeln.

import { describe, expect, it } from "vitest";
import { createDefaultFont, REPLACEMENT_CHARACTER } from "../../src/domain/font/font";
import { GLYPH_PATHS } from "../../src/domain/font/glyph-data";
import { Hyphenator } from "../../src/domain/text/hyphenator";
import { LineWrapper } from "../../src/domain/text/line-wrapper";
import { TextNormalizer } from "../../src/domain/text/text-normalizer";
import { Mulberry32 } from "../../src/domain/random/mulberry32";
import { loadPrototype } from "./prototype";

const prototype = loadPrototype();
const normalizer = new TextNormalizer(createDefaultFont(), () => undefined);

const SENTENCES = [
  "Hallo, ich bin ein Prototyp",
  "Hier ent|steht die Inter|net|prä|senz von Chris|tian Hör|auf",
  "Ich bin 8 Jahre alt und wohne in der Straße 12",
  "Das ist ein langer Platzhalter-Text zum Ausprobieren mehrerer Seiten",
  "Donaudampfschifffahrtsgesellschaftskapitän",
  "A B C D E F G 1 2 3 4 5 6 7 8 9",
  "Wie geht es dir? Gut. Und dir?",
  "X",
  "Zwei  Leerzeichen   und |Trennstellen| am Rand",
];

/** Zufällige Texte aus dem Zeichensatz, gewürfelt mit festem Startwert. */
function randomTexts(count: number): string[] {
  const random = new Mulberry32(2026);
  const alphabet = "abcdefghijklmnopqrstuvwxyzäöüßABCXYZÄ0123456789-.?    |";
  return Array.from({ length: count }, () => {
    const length = 1 + Math.floor(random.next() * 60);
    const characters = Array.from(
      { length },
      () => alphabet[Math.floor(random.next() * alphabet.length)],
    );
    return `A${characters.join("")}Z`;
  });
}

describe("Golden Master Text", () => {
  it("hat dieselben Glyphen wie der Prototyp, dazu '!' und die Ersatzglyphe", () => {
    const prototypeGlyphs = prototype.evaluate<Record<string, unknown>>("GLYPHS");

    const {
      "!": exclamationMark,
      [REPLACEMENT_CHARACTER]: replacement,
      ...rewriteGlyphs
    } = GLYPH_PATHS;

    expect(rewriteGlyphs).toEqual(prototypeGlyphs);
    expect(exclamationMark).toBeDefined();
    expect(replacement).toBeDefined();
  });

  it("bereitet Texte auf wie normalizeText", () => {
    for (const text of [...SENTENCES, ...randomTexts(300)]) {
      const expected = prototype.call<string>("normalizeText", text);
      expect(normalizer.normalize(text), text).toBe(expected);
    }
  });

  it("trennt Wörter wie hyphenate", () => {
    const words = [
      "INTER|NET|PRÄ|SENZ",
      "INTERNETPRÄSENZ",
      "AB|CDEFGH",
      "ABCDEFG",
      "AB|CD|EF",
      "DONAU|DAMPF|SCHIFF",
    ];
    for (const word of words) {
      for (let maxCharsPerLine = 1; maxCharsPerLine <= 20; maxCharsPerLine++) {
        const expected = prototype.call<string[]>("hyphenate", word, maxCharsPerLine);
        expect(
          new Hyphenator(maxCharsPerLine).split(word),
          `${word} / ${String(maxCharsPerLine)}`,
        ).toEqual(expected);
      }
    }
  });

  it("bricht Texte um wie wrapText, für Zeilenbreiten von 1 bis 40", () => {
    const texts = [...SENTENCES, ...randomTexts(150)].map((text) => normalizer.normalize(text));
    for (const text of texts) {
      for (let maxCharsPerLine = 1; maxCharsPerLine <= 40; maxCharsPerLine++) {
        const expected = prototype.call<string[]>("wrapText", text, maxCharsPerLine);
        expect(
          new LineWrapper(maxCharsPerLine).wrap(text),
          `${text} / ${String(maxCharsPerLine)}`,
        ).toEqual(expected);
      }
    }
  });
});
