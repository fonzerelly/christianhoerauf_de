import { describe, expect, it } from "vitest";
import { parseContent } from "./content";

const VALID = {
  unknownAnswer: "Weiß ich nicht",
  answers: [{ matchTerms: ["hallo", "hi"], answer: "HALLO" }],
};

describe("parseContent", () => {
  it("liest Standardantwort und Suchwort-Tabelle", () => {
    expect(parseContent(VALID)).toEqual(VALID);
  });

  it("liest das Stichwort eines Eintrags, wenn er eins hat", () => {
    const answers = [{ matchTerms: ["kafka"], answer: "Text", keyword: "KAFKA" }];

    expect(parseContent({ ...VALID, answers }).answers).toEqual(answers);
  });

  it("liest das Gimmick eines Eintrags, wenn er eins hat", () => {
    const answers = [{ matchTerms: ["herz"], answer: "Text", gimmick: "heart" }];

    expect(parseContent({ ...VALID, answers }).answers).toEqual(answers);
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
    ["keine Standardantwort", { ...VALID, unknownAnswer: undefined }, "unknownAnswer"],
    ["Tabelle ist keine Liste", { ...VALID, answers: "x" }, "answers"],
    ["Eintrag ist kein Objekt", { ...VALID, answers: [1] }, "answers[0]"],
    ["Eintrag ohne Antwort", { ...VALID, answers: [{ matchTerms: ["a"] }] }, "answers[0].answer"],
    [
      "Suchwörter sind keine Liste",
      { ...VALID, answers: [{ matchTerms: "a", answer: "A" }] },
      "answers[0].matchTerms",
    ],
    [
      "Suchwort ist kein Text",
      { ...VALID, answers: [{ matchTerms: [1], answer: "A" }] },
      "answers[0].matchTerms",
    ],
    [
      "Stichwort ist kein Text",
      { ...VALID, answers: [{ matchTerms: ["a"], answer: "A", keyword: 5 }] },
      "answers[0].keyword",
    ],
    [
      "Gimmick ist kein Text",
      { ...VALID, answers: [{ matchTerms: ["a"], answer: "A", gimmick: { type: "heart" } }] },
      "answers[0].gimmick",
    ],
  ])("lehnt ab: %s", (_name, json, field) => {
    expect(() => parseContent(json)).toThrow(field);
  });
});
