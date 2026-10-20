import { describe, expect, it } from "vitest";
import { QuestionForm } from "./question-form";

/** Eine Attrappe für ein Element mit Ereignissen: merkt sich die Hörer und löst sie auf Wunsch aus. */
function fakeElement() {
  const listeners = new Map<string, (event: { preventDefault(): void }) => void>();
  return {
    value: "",
    blurred: 0,
    blur() {
      this.blurred++;
    },
    addEventListener(type: string, listener: (event: { preventDefault(): void }) => void) {
      listeners.set(type, listener);
    },
    fire(type: string) {
      const event = {
        prevented: false,
        preventDefault() {
          this.prevented = true;
        },
      };
      listeners.get(type)?.(event);
      return event;
    },
  };
}

function setup(blurAfterSending = false) {
  const form = fakeElement();
  const input = fakeElement();
  const questions: string[] = [];
  let scrolledToTop = 0;
  new QuestionForm(form, input, {
    blurAfterSending,
    scrollToTop: () => {
      scrolledToTop++;
    },
    onQuestion: (question) => questions.push(question),
  });
  return { form, input, questions, scrolled: () => scrolledToTop };
}

describe("QuestionForm", () => {
  it("meldet die Frage ohne Leerraum am Rand und leert das Feld", () => {
    const { form, input, questions } = setup();
    input.value = "  Wer bist du?  ";

    form.fire("submit");

    expect(questions).toEqual(["Wer bist du?"]);
    expect(input.value).toBe("");
  });

  it("verhindert, dass der Browser die Seite neu lädt", () => {
    const { form } = setup();

    expect(form.fire("submit").prevented).toBe(true);
  });

  it("übergeht eine leere Eingabe und lässt das Feld, wie es ist", () => {
    const { form, input, questions } = setup();
    input.value = "   ";

    form.fire("submit");

    expect(questions).toEqual([]);
    expect(input.value).toBe("   ");
  });

  it("verlässt das Feld nach dem Senden, wenn es verlangt ist (schließt am Handy die Tastatur)", () => {
    const { form, input } = setup(true);
    input.value = "Hallo";

    form.fire("submit");

    expect(input.blurred).toBe(1);
  });

  it("bleibt sonst im Feld", () => {
    const { form, input } = setup(false);
    input.value = "Hallo";

    form.fire("submit");

    expect(input.blurred).toBe(0);
  });

  it("bleibt auch im Feld, wenn nichts zu senden war", () => {
    const { form, input } = setup(true);

    form.fire("submit");

    expect(input.blurred).toBe(0);
  });

  it("schiebt die Seite beim Verlassen des Felds wieder ganz nach oben (iOS)", () => {
    const { input, scrolled } = setup();

    input.fire("blur");

    expect(scrolled()).toBe(1);
  });
});
