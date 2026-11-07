import { describe, expect, it } from "vitest";
import { addressAndSurname, greetingKeyword, greetingParagraphs } from "./greeting";
import type { PersonalLink } from "./personal-link";

const ERIKA: PersonalLink = { kind: "valid", variant: 4711, name: "Frau Erika Muster" };
const canWriteAll = (): boolean => true;

describe("addressAndSurname", () => {
  it.each([
    ["Frau Erika Muster", "Frau Muster"],
    ["Herr Jörg Müßig", "Herr Müßig"],
    ["frau erika muster", "frau muster"],
    ["Frau Muster", "Frau Muster"],
    ["Team Personal", "Team Personal"],
    ["  Frau   Erika  Muster ", "Frau Muster"],
  ])("macht aus „%s“ „%s“", (name, expected) => {
    expect(addressAndSurname(name)).toBe(expected);
  });
});

describe("greetingKeyword", () => {
  it("am Desktop: Hallo, dann in einer eigenen Zeile Anrede und Nachname", () => {
    expect(greetingKeyword(ERIKA, { withHello: true, canWrite: canWriteAll })).toBe(
      "Hallo\nFrau Muster",
    );
  });

  it("am Handy: nur Anrede und Nachname", () => {
    expect(greetingKeyword(ERIKA, { withHello: false, canWrite: canWriteAll })).toBe("Frau Muster");
  });

  it.each<[string, PersonalLink]>([
    ["ohne Link", { kind: "none" }],
    ["mit kaputtem Link", { kind: "broken" }],
  ])("%s nur Hallo", (_case, link) => {
    expect(greetingKeyword(link, { withHello: true, canWrite: canWriteAll })).toBe("Hallo");
    expect(greetingKeyword(link, { withHello: false, canWrite: canWriteAll })).toBe("Hallo");
  });

  it("nur Hallo, wenn die Schrift ein Zeichen des Namens nicht kennt", () => {
    const asked: string[] = [];
    const canWrite = (text: string): boolean => {
      asked.push(text);
      return false;
    };

    expect(greetingKeyword(ERIKA, { withHello: true, canWrite })).toBe("Hallo");
    expect(asked).toEqual(["Frau Muster"]);
  });
});

describe("greetingParagraphs", () => {
  it("spricht mit gültigem Link mit vollem Namen an und erklärt die Seite", () => {
    const paragraphs = greetingParagraphs(ERIKA);

    expect(paragraphs[0]).toBe("Hallo Frau Erika Muster,");
    expect(paragraphs.slice(1).join(" ")).toContain("Chris ausfragen");
    expect(paragraphs.slice(1).join(" ")).toContain("Zeitleiste");
    expect(paragraphs).toHaveLength(3);
  });

  it("ohne Link ohne Namen", () => {
    expect(greetingParagraphs({ kind: "none" })[0]).toBe("Hallo,");
    expect(greetingParagraphs({ kind: "none" })).toHaveLength(3);
  });

  it("sagt bei kaputtem Link, dass die Seite nicht persönlich eingerichtet werden konnte", () => {
    const paragraphs = greetingParagraphs({ kind: "broken" });

    expect(paragraphs[0]).toBe("Hallo,");
    expect(paragraphs).toHaveLength(4);
    expect(paragraphs[3]).toContain("nicht geklappt");
  });
});
