import { describe, expect, it } from "vitest";
import { StaticContentAnswerSource, UNAVAILABLE_ANSWER } from "./static-content-answer-source";

const CONTENT = {
  greeting: "Hier entsteht etwas",
  unknownAnswer: "Weiß ich nicht",
  answers: [{ keywords: ["hallo"], answer: "HALLO" }],
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
  it("antwortet auf eine leere Frage mit der Begrüßung", async () => {
    const source = new StaticContentAnswerSource(loader(() => Promise.resolve(CONTENT)).load);

    await expect(source.answer("")).resolves.toEqual({ text: "Hier entsteht etwas" });
  });

  it("antwortet auf eine Frage mit der Antwort des passenden Stichworts", async () => {
    const source = new StaticContentAnswerSource(loader(() => Promise.resolve(CONTENT)).load);

    await expect(source.answer("Hallo du!")).resolves.toEqual({ text: "HALLO" });
  });

  it("antwortet mit der Standardantwort, wenn kein Stichwort passt", async () => {
    const source = new StaticContentAnswerSource(loader(() => Promise.resolve(CONTENT)).load);

    await expect(source.answer("Was kostet das")).resolves.toEqual({ text: "Weiß ich nicht" });
  });

  it("lädt den Inhalt nur einmal, auch wenn mehrere Fragen gleichzeitig kommen", async () => {
    const { load, state } = loader(() => Promise.resolve(CONTENT));
    const source = new StaticContentAnswerSource(load);

    await Promise.all([source.answer(""), source.answer("hallo"), source.answer("x")]);
    await source.answer("noch eine");

    expect(state.calls).toBe(1);
  });

  it("sagt, dass es gerade nicht geht, wenn der Inhalt nicht zu laden ist, und versucht es beim nächsten Mal wieder", async () => {
    let fails = true;
    const { load, state } = loader(() =>
      fails ? Promise.reject(new Error("offline")) : Promise.resolve(CONTENT),
    );
    const source = new StaticContentAnswerSource(load);

    await expect(source.answer("hallo")).resolves.toEqual({ text: UNAVAILABLE_ANSWER });
    fails = false;
    await expect(source.answer("hallo")).resolves.toEqual({ text: "HALLO" });
    expect(state.calls).toBe(2);
  });

  it("sagt dasselbe, wenn der Inhalt die falsche Form hat", async () => {
    const source = new StaticContentAnswerSource(loader(() => Promise.resolve({ foo: 1 })).load);

    await expect(source.answer("")).resolves.toEqual({ text: UNAVAILABLE_ANSWER });
  });
});
