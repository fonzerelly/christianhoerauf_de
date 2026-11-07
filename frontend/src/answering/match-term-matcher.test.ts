import { describe, expect, it } from "vitest";
import { MatchTermMatcher } from "./match-term-matcher";

const ENTRIES = [
  { matchTerms: ["wer bist du", "name"], answer: "CHRISTIAN" },
  { matchTerms: ["hallo", "hi", "guten tag"], answer: "HALLO" },
  { matchTerms: ["hi"], answer: "ZWEITER TREFFER" },
];

const matcher = new MatchTermMatcher(ENTRIES);

describe("MatchTermMatcher", () => {
  it("findet die Antwort des Eintrags, von dem ein Suchwort in der Frage vorkommt", () => {
    expect(matcher.find("Hallo zusammen")).toBe("HALLO");
  });

  it("findet auch Wortfolgen", () => {
    expect(matcher.find("Wer bist du eigentlich?")).toBe("CHRISTIAN");
    expect(matcher.find("Guten Tag!")).toBe("HALLO");
  });

  it("achtet nicht auf Groß- und Kleinschreibung und nicht auf Satzzeichen", () => {
    expect(matcher.find("HALLO!!!")).toBe("HALLO");
    expect(matcher.find("wer, bist; du?")).toBe("CHRISTIAN");
  });

  it("findet nur ganze Wörter: hi passt nicht auf Schiff", () => {
    expect(matcher.find("Schiff ahoi")).toBeUndefined();
    expect(matcher.find("Ich sehe ein Schiff")).toBeUndefined();
  });

  it("nimmt den ersten passenden Eintrag", () => {
    expect(matcher.find("hi")).toBe("HALLO");
  });

  it("liefert nichts, wenn kein Suchwort passt", () => {
    expect(matcher.find("Wie wird das Wetter")).toBeUndefined();
  });

  it("kommt mit Umlauten und Ziffern zurecht", () => {
    const umlauts = new MatchTermMatcher([{ matchTerms: ["tschüss", "24h"], answer: "BIS BALD" }]);

    expect(umlauts.find("Tschüss!")).toBe("BIS BALD");
    expect(umlauts.find("Das dauert 24h")).toBe("BIS BALD");
  });

  it("liefert nichts ohne Einträge", () => {
    expect(new MatchTermMatcher([]).find("Hallo")).toBeUndefined();
  });
});
