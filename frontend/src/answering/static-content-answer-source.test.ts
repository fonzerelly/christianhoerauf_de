import { describe, expect, it } from "vitest";
import { StaticContentAnswerSource, UNAVAILABLE_ANSWER } from "./static-content-answer-source";

const CONTENT = {
  unknownAnswer: "Weiß ich nicht",
  answers: [
    { matchTerms: ["hallo"], answer: "HALLO" },
    { matchTerms: ["kafka"], answer: "Über Kafka", keyword: "KAFKA" },
    { matchTerms: ["herz"], answer: "Ein Herz", keyword: "<3", gimmick: "heart" },
  ],
};

/** Ein Lader, der mitzählt, wie oft er gerufen wurde. */
function loader(result: () => Promise<unknown>) {
  const state = { calls: 0 };
  return {
    state,
    load: () => {
      state.calls++;
      return result();
    },
  };
}

describe("StaticContentAnswerSource", () => {
  it("antwortet auf eine Frage mit der Antwort des passenden Suchworts", async () => {
    const source = new StaticContentAnswerSource(loader(() => Promise.resolve(CONTENT)).load);

    await expect(source.answer("Hallo du!")).resolves.toEqual({ text: "HALLO" });
  });

  it("liefert das Stichwort des Eintrags mit, wenn er eins hat", async () => {
    const source = new StaticContentAnswerSource(loader(() => Promise.resolve(CONTENT)).load);

    await expect(source.answer("Was ist Kafka?")).resolves.toEqual({
      text: "Über Kafka",
      keyword: "KAFKA",
    });
  });

  it("liefert das Gimmick des Eintrags mit, wenn er eins hat (wie das Backend: mit `type`)", async () => {
    const source = new StaticContentAnswerSource(loader(() => Promise.resolve(CONTENT)).load);

    await expect(source.answer("Ein Herz?")).resolves.toEqual({
      text: "Ein Herz",
      keyword: "<3",
      gimmick: { type: "heart" },
    });
  });

  it("antwortet mit der Standardantwort, wenn kein Suchwort passt", async () => {
    const source = new StaticContentAnswerSource(loader(() => Promise.resolve(CONTENT)).load);

    await expect(source.answer("Was kostet das")).resolves.toEqual({ text: "Weiß ich nicht" });
  });

  it("lädt den Inhalt nur einmal, auch wenn mehrere Fragen gleichzeitig kommen", async () => {
    const { load, state } = loader(() => Promise.resolve(CONTENT));
    const source = new StaticContentAnswerSource(load);

    await Promise.all([source.answer("y"), source.answer("hallo"), source.answer("x")]);
    await source.answer("noch eine");

    expect(state.calls).toBe(1);
  });

  it("sagt, dass es gerade nicht geht, wenn der Inhalt nicht zu laden ist, und versucht es beim nächsten Mal wieder", async () => {
    let fails = true;
    const { load, state } = loader(() =>
      fails ? Promise.reject(new Error("offline")) : Promise.resolve(CONTENT),
    );
    const source = new StaticContentAnswerSource(load);

    await expect(source.answer("hallo")).resolves.toEqual({
      text: UNAVAILABLE_ANSWER,
      keyword: "OFFLINE",
    });
    fails = false;
    await expect(source.answer("hallo")).resolves.toEqual({ text: "HALLO" });
    expect(state.calls).toBe(2);
  });

  it("sagt dasselbe, wenn der Inhalt die falsche Form hat", async () => {
    const source = new StaticContentAnswerSource(loader(() => Promise.resolve({ foo: 1 })).load);

    await expect(source.answer("hallo")).resolves.toEqual({
      text: UNAVAILABLE_ANSWER,
      keyword: "OFFLINE",
    });
  });
});
