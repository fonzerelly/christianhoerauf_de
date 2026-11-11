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
  const INTRODUCTION =
    "es freut mich, dass Sie den Weg zu mir gefunden haben. Ich bin ChrisBot und kann hoffentlich " +
    "zu allem Auskunft geben, was Sie über Christian Hörauf wissen möchten.";
  const HOW_TO_ASK =
    "Sie können entweder freie Fragen stellen, oder Sie lassen sich durch die Beispielfragen aus " +
    "dem Werdegang von Herrn Hörauf inspirieren. Klicken Sie dafür einfach auf das Thema aus dem " +
    "Werdegang, das Sie interessiert, und eine passende Frage erscheint im Eingabefeld.";

  it("spricht mit gültigem Link mit vollem Namen an und erklärt die Seite", () => {
    expect(greetingParagraphs(ERIKA)).toEqual([
      "Hallo Frau Erika Muster,",
      INTRODUCTION,
      HOW_TO_ASK,
    ]);
  });

  it("ohne Link derselbe Text ohne Namen", () => {
    expect(greetingParagraphs({ kind: "none" })).toEqual(["Hallo,", INTRODUCTION, HOW_TO_ASK]);
  });

  it("bei kaputtem Link derselbe Text ohne Namen", () => {
    expect(greetingParagraphs({ kind: "broken" })).toEqual(["Hallo,", INTRODUCTION, HOW_TO_ASK]);
  });
});
