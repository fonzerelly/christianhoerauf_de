import { describe, expect, it } from "vitest";
import { createDefaultFont } from "../font/font";
import { TextNormalizer } from "./text-normalizer";

function createNormalizer() {
  const reportedUnknown: (readonly string[])[] = [];
  const normalizer = new TextNormalizer(createDefaultFont(), (characters) =>
    reportedUnknown.push(characters),
  );
  return { normalizer, reportedUnknown };
}

describe("TextNormalizer", () => {
  const { normalizer } = createNormalizer();

  it("schreibt alles groß", () => {
    expect(normalizer.normalize("Hallo Welt")).toBe("HALLO WELT");
  });

  it("macht aus ß zwei S", () => {
    expect(normalizer.normalize("Straße")).toBe("STRASSE");
  });

  it("behält Umlaute, auch wenn sie aus Buchstabe und Pünktchen zusammengesetzt sind", () => {
    expect(normalizer.normalize("größer")).toBe("GRÖSSER");
    expect(normalizer.normalize("Ä".normalize("NFD"))).toBe("Ä");
  });

  it("macht aus Buchstaben mit Akzent den Grundbuchstaben", () => {
    expect(normalizer.normalize("Café É ñ")).toBe("CAFE E N");
  });

  it("macht aus Komma, Semikolon und Doppelpunkt ein Leerzeichen", () => {
    expect(normalizer.normalize("a,b;c:d")).toBe("A B C D");
  });

  it("fasst mehrere Leerzeichen zusammen und schneidet sie an den Enden ab", () => {
    expect(normalizer.normalize("  a ,  b  ")).toBe("A B");
  });

  it("macht aus jeder Art Leerraum ein Leerzeichen", () => {
    expect(normalizer.normalize("a\tb\nc\r\nd e")).toBe("A B C D E");
  });

  it("lässt Trennstellen stehen", () => {
    expect(normalizer.normalize("Inter|net")).toBe("INTER|NET");
  });

  it("lässt Ausrufezeichen, Fragezeichen, Punkt, Bindestrich und Ziffern stehen", () => {
    expect(normalizer.normalize("a-b. c? d! 0123456789")).toBe("A-B. C? D! 0123456789");
  });

  it("macht aus jedem unbekannten Zeichen genau eine Ersatzglyphe", () => {
    expect(normalizer.normalize("a€b")).toBe("A█B");
    expect(normalizer.normalize("日本")).toBe("██");
  });

  it("macht aus einem zusammengesetzten Emoji nur eine Ersatzglyphe", () => {
    expect(normalizer.normalize("👨‍👩‍👧")).toBe("█");
  });

  it("macht aus einem Zeichen, dessen Grundbuchstabe nicht darstellbar ist, eine Ersatzglyphe", () => {
    expect(normalizer.normalize("ø ŉ")).toBe("█ █");
  });

  it("macht aus einem einzelnen Akzentzeichen ohne Buchstaben eine Ersatzglyphe", () => {
    expect(normalizer.normalize("́")).toBe("█");
  });

  it("lässt unsichtbare Steuer- und Formatzeichen verschwinden", () => {
    expect(normalizer.normalize("a\u0000b‍c")).toBe("ABC");
  });

  it("lässt eine vorhandene Ersatzglyphe stehen", () => {
    expect(normalizer.normalize("a█b")).toBe("A█B");
  });

  it("liefert ein Fragezeichen, wenn nichts Sichtbares übrig bleibt", () => {
    expect(normalizer.normalize("")).toBe("?");
    expect(normalizer.normalize("  ,; ")).toBe("?");
    expect(normalizer.normalize(" | ")).toBe("?");
    expect(normalizer.normalize("​")).toBe("?");
  });

  it("meldet unbekannte Zeichen einmal je Aufruf mit allen betroffenen Zeichen", () => {
    const { normalizer: reporting, reportedUnknown } = createNormalizer();

    reporting.normalize("a€b日");

    expect(reportedUnknown).toEqual([["€", "日"]]);
  });

  it("meldet nichts, wenn alle Zeichen darstellbar sind", () => {
    const { normalizer: reporting, reportedUnknown } = createNormalizer();

    reporting.normalize("Hallo Welt, ä é");

    expect(reportedUnknown).toEqual([]);
  });
});
