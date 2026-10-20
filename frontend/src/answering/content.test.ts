import { describe, expect, it } from "vitest";
import { parseContent } from "./content";

const VALID = {
  greeting: "Hallo",
  unknownAnswer: "Weiß ich nicht",
  answers: [{ keywords: ["hallo", "hi"], answer: "HALLO" }],
};

describe("parseContent", () => {
  it("liest Begrüßung, Standardantwort und Stichwort-Tabelle", () => {
    expect(parseContent(VALID)).toEqual(VALID);
  });

  it("lässt eine leere Tabelle zu", () => {
    expect(parseContent({ ...VALID, answers: [] }).answers).toEqual([]);
  });

  it("nimmt nur die bekannten Felder", () => {
    expect(parseContent({ ...VALID, extra: 1 })).toEqual(VALID);
  });

  it.each([
    ["kein Objekt", "text", "Der Inhalt"],
    ["null", null, "Der Inhalt"],
    ["keine Begrüßung", { ...VALID, greeting: undefined }, "greeting"],
    ["Begrüßung ist kein Text", { ...VALID, greeting: 5 }, "greeting"],
    ["keine Standardantwort", { ...VALID, unknownAnswer: undefined }, "unknownAnswer"],
    ["Tabelle ist keine Liste", { ...VALID, answers: "x" }, "answers"],
    ["Eintrag ist kein Objekt", { ...VALID, answers: [1] }, "answers[0]"],
    ["Eintrag ohne Antwort", { ...VALID, answers: [{ keywords: ["a"] }] }, "answers[0].answer"],
    [
      "Stichwörter sind keine Liste",
      { ...VALID, answers: [{ keywords: "a", answer: "A" }] },
      "answers[0].keywords",
    ],
    [
      "Stichwort ist kein Text",
      { ...VALID, answers: [{ keywords: [1], answer: "A" }] },
      "answers[0].keywords",
    ],
  ])("lehnt ab: %s", (_name, json, field) => {
    expect(() => parseContent(json)).toThrow(field);
  });
});
