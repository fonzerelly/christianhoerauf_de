import { describe, expect, it } from "vitest";
import { FakeElement, fakeDocument } from "../test-support/fake-dom";
import { AnswerArea } from "./answer-area";

function setup(options: { areaTop?: number; viewportHeight?: number } = {}) {
  const area = new FakeElement("section");
  const suggestions = new FakeElement("div");
  const input = {
    value: "",
    focused: 0,
    focus() {
      this.focused++;
    },
  };
  let scrolled = 0;
  const answerArea = new AnswerArea({
    document: fakeDocument,
    area,
    suggestions,
    questionInput: input,
    areaTop: () => options.areaTop ?? 100,
    viewportHeight: () => options.viewportHeight ?? 800,
    scrollToArea: () => {
      scrolled++;
    },
  });
  return { area, suggestions, input, answerArea, scrolled: () => scrolled };
}

describe("AnswerArea", () => {
  it("zeigt die Frage klein und die Antwort in Absätzen", () => {
    const { area, answerArea } = setup();

    answerArea.showAnswer("Wer bist du?", { text: "Erster Absatz.\n\nZweiter Absatz." });

    expect(area.hidden).toBe(false);
    expect(area.childTexts()).toEqual([
      "question: Ihre Frage: Wer bist du?",
      "answer: Erster Absatz.",
      "answer: Zweiter Absatz.",
    ]);
  });

  it("zeigt die Begrüßung ohne Frage", () => {
    const { area, answerArea } = setup();

    answerArea.showAnswer(undefined, { text: "Hallo," });

    expect(area.childTexts()).toEqual(["answer: Hallo,"]);
  });

  it("lässt die Trennstellen-Zeichen weg", () => {
    const { area, answerArea } = setup();

    answerArea.showAnswer(undefined, { text: "Inter|net|prä|senz" });

    expect(area.childTexts()).toEqual(["answer: Internetpräsenz"]);
  });

  it("zeigt beim Warten die neue Frage, dass der Bot nachdenkt, und die alte Antwort blass", () => {
    const { area, answerArea } = setup();
    answerArea.showAnswer("erste", { text: "Alte Antwort." });

    answerArea.showWaiting("zweite");

    expect(area.childTexts()).toEqual([
      "question: Ihre Frage: zweite",
      "thinking: Der Bot denkt nach",
      "answer: Alte Antwort.",
    ]);
    expect(area.hasClass("waiting")).toBe(true);
  });

  it("ist nach der Antwort nicht mehr im Warten", () => {
    const { area, answerArea } = setup();
    answerArea.showWaiting("Frage");

    answerArea.showAnswer("Frage", { text: "Antwort." });

    expect(area.hasClass("waiting")).toBe(false);
  });

  it("zeigt Folgefragen als Knöpfe; ein Klick trägt sie ins Fragefeld ein und schickt nicht ab", () => {
    const { suggestions, input, answerArea } = setup();

    answerArea.showAnswer("Frage", { text: "Antwort.", suggestions: ["Und dann?", "Wo?"] });

    expect(suggestions.hidden).toBe(false);
    expect(suggestions.children.map((button) => button.textContent)).toEqual(["Und dann?", "Wo?"]);
    expect(suggestions.children[0]?.attributes.get("type")).toBe("button");
    suggestions.children[1]?.click();
    expect(input.value).toBe("Wo?");
    expect(input.focused).toBe(1);
  });

  it("versteckt die Folgefragen, wenn es keine gibt, und schon während des Wartens", () => {
    const { suggestions, answerArea } = setup();
    answerArea.showAnswer("Frage", { text: "Antwort.", suggestions: ["Und dann?"] });

    answerArea.showWaiting("Neue Frage");
    expect(suggestions.hidden).toBe(true);
    expect(suggestions.children).toEqual([]);

    answerArea.showAnswer("Neue Frage", { text: "Antwort." });
    expect(suggestions.hidden).toBe(true);
  });

  // Q32: Kommt eine Antwort und ist ihr Anfang nicht gut zu sehen, scrollt die Seite hin.
  it.each([
    ["oberhalb des Fensters", -50, 1],
    ["weiter unten als 60 % der Fensterhöhe", 500, 1],
    ["gut zu sehen", 300, 0],
  ])("holt die Antwort ins Bild, wenn ihr Anfang %s liegt", (_where, areaTop, scrolls) => {
    const { answerArea, scrolled } = setup({ areaTop, viewportHeight: 800 });

    answerArea.showAnswer("Frage", { text: "Antwort." });

    expect(scrolled()).toBe(scrolls);
  });

  it("scrollt bei der Begrüßung nicht", () => {
    const { answerArea, scrolled } = setup({ areaTop: 900, viewportHeight: 800 });

    answerArea.showAnswer(undefined, { text: "Hallo," });

    expect(scrolled()).toBe(0);
  });
});
