import { describe, expect, it } from "vitest";
import { REPLACEMENT_CHARACTER as R } from "../font/font";
import { LineWrapper } from "./line-wrapper";

function wrap(text: string, maxCharsPerLine: number): string[] {
  return new LineWrapper(maxCharsPerLine).wrap(text);
}

describe("LineWrapper", () => {
  it("lässt einen Text, der in eine Zeile passt, in einer Zeile", () => {
    expect(wrap("HALLO WELT", 20)).toEqual(["HALLO WELT"]);
  });

  it("bricht an Wortgrenzen um", () => {
    expect(wrap("HALLO WELT WIE GEHT ES", 10)).toEqual(["HALLO WELT", "WIE GEHT", "ES"]);
  });

  it("liefert für einen leeren Text keine Zeile", () => {
    expect(wrap("", 5)).toEqual([]);
  });

  it("überspringt Wörter, die nur aus Trennstellen bestehen", () => {
    expect(wrap("| A", 5)).toEqual(["A"]);
  });

  it("trennt ein zu langes Wort mit Strich, bevorzugt an den Trennstellen", () => {
    expect(wrap("INTER|NET|PRÄ|SENZ VON CHRIS|TIAN", 8)).toEqual([
      "INTER-",
      "NETPRÄ-",
      "SENZ VON",
      "CHRIS-",
      "TIAN",
    ]);
  });

  it("beginnt ein zu langes Wort in einer neuen Zeile, das Wort davor bleibt stehen", () => {
    expect(wrap("X ABCDEFGHIJKLMNOP", 6)).toEqual(["X", "ABCDE-", "FGHIJ-", "KLMNOP"]);
  });

  it("setzt das Wort nach einem getrennten Wort in eine neue Zeile, wenn es nicht mehr passt", () => {
    expect(wrap("ABCDEFGHIJKLMNOP X", 6)).toEqual(["ABCDE-", "FGHIJ-", "KLMNOP", "X"]);
  });

  it("lässt kein einzelnes Zeichen allein in einer Zeile: das letzte Wort davor rutscht mit", () => {
    expect(wrap("AB CD 8", 5)).toEqual(["AB", "CD 8"]);
  });

  it("lässt ein einzelnes Zeichen allein, wenn davor nur ein Wort steht", () => {
    expect(wrap("AB 8", 3)).toEqual(["AB", "8"]);
  });

  it("lässt ein einzelnes Zeichen allein, wenn die Zeile davor mit einem Bindestrich endet", () => {
    expect(wrap("AB CD- 8", 6)).toEqual(["AB CD-", "8"]);
  });

  it("lässt ein einzelnes Zeichen am Ende eines Worts allein, das ohne Strich getrennt wurde", () => {
    expect(wrap("ABCDEFG", 2)).toEqual(["AB", "CD", "EF", "G"]);
  });

  describe("mit der Ersatzglyphe, die so breit ist wie zwei Zeichen", () => {
    it("rechnet sie beim Füllen einer Zeile doppelt", () => {
      expect(wrap(`AB ${R} CD`, 5)).toEqual([`AB ${R}`, "CD"]);
      expect(wrap(`A ${R} CD`, 7)).toEqual([`A ${R} CD`]);
      expect(wrap(`A ${R} CD`, 6)).toEqual([`A ${R}`, "CD"]);
    });

    it("trennt ein Wort, das nur wegen der doppelten Breite nicht passt", () => {
      expect(wrap(`AB${R}CD`, 5)).toEqual([`AB${R}-`, "CD"]);
    });

    it("hält eine Ersatzglyphe allein in einer Zeile nicht für ein einsames Zeichen", () => {
      expect(wrap(`AB CD ${R}`, 5)).toEqual(["AB CD", R]);
    });

    it("lässt eine Ersatzglyphe nach unten rutschen, wenn sie ein einsames Zeichen rettet", () => {
      expect(wrap(`XY ${R} 8`, 5)).toEqual(["XY", `${R} 8`]);
    });
  });
});
