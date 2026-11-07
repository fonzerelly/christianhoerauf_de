import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { checksumOf, fnv1a, readPersonalLink } from "./personal-link";

/** Dieselben Beispiele, mit denen das Backend den Link baut (backend/tests/domain/test_personal_link.py). */
interface Examples {
  readonly gueltig: readonly { nummer: number; name: string; fragment: string }[];
  readonly kaputt: readonly { grund: string; fragment: string }[];
}
const examples = JSON.parse(
  readFileSync(
    new URL("../../../../backend/schema/personal-link.examples.json", import.meta.url),
    "utf8",
  ),
) as Examples;

describe("fnv1a", () => {
  it("rechnet FNV-1a mit 32 Bit über die Unicode-Zeichen", () => {
    expect(fnv1a("")).toBe(0x811c9dc5);
    expect(fnv1a("a")).toBe(0xe40c292c);
  });

  it("zählt Zeichen außerhalb der Grundebene als ein Zeichen, wie Python", () => {
    expect(fnv1a("😀")).toBe(Math.imul(0x811c9dc5 ^ 0x1f600, 0x01000193) >>> 0);
  });
});

describe("checksumOf", () => {
  it("sind die ersten 4 Hex-Ziffern von FNV-1a über „Nummer|Name“", () => {
    expect(checksumOf(4711, "Frau Erika Muster")).toBe("e9bd");
  });
});

describe("readPersonalLink", () => {
  it("ohne Teil hinter # gibt es keinen Link", () => {
    expect(readPersonalLink("")).toEqual({ kind: "none" });
    expect(readPersonalLink("#")).toEqual({ kind: "none" });
  });

  it.each(examples.gueltig)("liest $name (Variante $nummer)", ({ nummer, name, fragment }) => {
    expect(readPersonalLink(`#${fragment}`)).toEqual({ kind: "valid", variant: nummer, name });
  });

  it.each(examples.kaputt)("erkennt einen kaputten Link: $grund", ({ fragment }) => {
    expect(readPersonalLink(`#${fragment}`)).toEqual({ kind: "broken" });
  });

  it.each([
    ["ohne Prüfsumme", "NDcxMXxGcmF1IEVyaWthIE11c3Rlcg"],
    ["keine Zahl als Variante", btoa("vier|Frau Muster|0000")],
    ["kein UTF-8", btoa("\xff\xfe|x|0000")],
  ])("erkennt einen kaputten Link: %s", (_reason, fragment) => {
    expect(readPersonalLink(`#${fragment}`)).toEqual({ kind: "broken" });
  });

  it("nimmt einen Namen mit „|“ als Ganzes (alles zwischen Nummer und Prüfsumme)", () => {
    const name = "A|B";
    const text = `7|${name}|${checksumOf(7, name)}`;
    const fragment = btoa(text).replace(/=+$/, "");

    expect(readPersonalLink(`#${fragment}`)).toEqual({ kind: "valid", variant: 7, name });
  });
});
