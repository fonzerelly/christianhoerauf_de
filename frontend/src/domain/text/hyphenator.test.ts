import { describe, expect, it } from "vitest";
import { REPLACEMENT_CHARACTER as R } from "../font/font";
import { Hyphenator } from "./hyphenator";

describe("Hyphenator", () => {
  it("trennt an der spätesten Trennstelle, bei der das Stück samt Strich noch passt", () => {
    expect(new Hyphenator(8).split("INTER|NET|PRÄ|SENZ")).toEqual(["INTER-", "NETPRÄ-", "SENZ"]);
  });

  it("trennt ohne Trennstellen nach Platz: das Stück füllt die Zeile", () => {
    expect(new Hyphenator(8).split("INTERNETPRÄSENZ")).toEqual(["INTERNE-", "TPRÄSENZ"]);
    expect(new Hyphenator(3).split("ABCDEFGHIJ")).toEqual(["AB-", "CD-", "EF-", "GH-", "IJ"]);
  });

  it("trennt nach Platz, wenn keine Trennstelle ins Stück passt", () => {
    expect(new Hyphenator(5).split("AB|CDEFGH")).toEqual(["AB-", "CDEF-", "GH"]);
  });

  it("trennt ohne Strich, wenn die Zeile für zwei Buchstaben und einen Strich zu kurz ist", () => {
    expect(new Hyphenator(2).split("ABCDEFG")).toEqual(["AB", "CD", "EF", "G"]);
    expect(new Hyphenator(1).split("ABC")).toEqual(["A", "B", "C"]);
  });

  it("liefert ein Wort, das in die Zeile passt, als einziges Stück", () => {
    expect(new Hyphenator(8).split("KURZ")).toEqual(["KURZ"]);
  });

  it("ignoriert Trennstellen ohne Strich, wenn kein Platz für den Strich ist", () => {
    expect(new Hyphenator(2).split("AB|CD|EF")).toEqual(["AB", "CD", "EF"]);
  });

  describe("mit der Ersatzglyphe, die so breit ist wie zwei Zeichen", () => {
    it("rechnet sie beim Trennen nach Platz doppelt", () => {
      expect(new Hyphenator(5).split(`A${R}BCDEFG`)).toEqual([`A${R}B-`, "CDEFG"]);
    });

    it("rechnet sie beim Trennen an einer Trennstelle doppelt", () => {
      expect(new Hyphenator(5).split(`A${R}|BCDEF`)).toEqual([`A${R}-`, "BCDEF"]);
    });

    it("lässt ein Wort in einem Stück, das mit der doppelten Breite gerade passt", () => {
      expect(new Hyphenator(6).split(`AB${R}CD`)).toEqual([`AB${R}CD`]);
    });

    it("trennt ein Wort, das nur wegen der doppelten Breite nicht passt", () => {
      expect(new Hyphenator(5).split(`AB${R}CD`)).toEqual([`AB${R}-`, "CD"]);
    });

    it("setzt sie allein in ein Stück, wenn die Zeile für sie zu schmal ist", () => {
      expect(new Hyphenator(1).split(`${R}${R}`)).toEqual([R, R]);
    });
  });
});
