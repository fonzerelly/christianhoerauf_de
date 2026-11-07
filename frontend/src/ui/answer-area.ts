import { withoutBreakMarks } from "../domain/text/break-marks";
import type { ElementFactory, ElementLike } from "./dom-like";

/** Liegt der Anfang der Antwort tiefer als dieser Anteil der Fensterhöhe, scrollt die Seite hin (Q32). */
const WELL_VISIBLE_SHARE = 0.6;

export interface AnswerAreaParts<Element extends ElementLike<Element>> {
  /** Legt Absätze und Knöpfe an (im Browser `document`). */
  readonly document: ElementFactory<Element>;
  /** Der Antwortbereich (`aria-live`): Frage klein, darunter die Antwort. */
  readonly area: Element;
  /** Der Platz für die Folgefragen. */
  readonly suggestions: Element;
  /** Das Fragefeld: Eine Folgefrage wird dort eingetragen. */
  readonly questionInput: { value: string; focus(): void };
  /** Wo der Anfang des Antwortbereichs im Fenster liegt (Pixel ab Oberkante). */
  readonly areaTop: () => number;
  readonly viewportHeight: () => number;
  /** Scrollt den Antwortbereich an den Anfang des Fensters. */
  readonly scrollToArea: () => void;
}

/**
 * Der Antwortbereich unter der Zeitleiste (ADR 0007, Q6, Q7, Q22, Q32): Die Frage steht klein
 * darüber, die Antwort als Absätze darunter; eine neue Antwort ersetzt die alte. Während auf die
 * Antwort gewartet wird, steht die neue Frage schon da, darunter „Der Bot denkt nach“, und die alte
 * Antwort wird blass (Klasse `waiting`). Folgefragen erscheinen als Knöpfe; ein Klick trägt sie ins
 * Fragefeld ein und schickt nicht ab. Der Bereich ist der `aria-live`-Bereich für Screenreader.
 */
export class AnswerArea<Element extends ElementLike<Element>> {
  /** Die Absätze der zuletzt gezeigten Antwort; beim Warten bleiben sie blass stehen. */
  private answerParagraphs: Element[] = [];

  public constructor(private readonly parts: AnswerAreaParts<Element>) {}

  /** Eine Frage ist gestellt, die Antwort fehlt noch. */
  public showWaiting(question: string): void {
    const { area } = this.parts;
    area.hidden = false;
    area.classList.toggle("waiting", true);
    area.replaceChildren(
      this.paragraph("question", `Ihre Frage: ${question}`),
      this.paragraph("thinking", "Der Bot denkt nach"),
      ...this.answerParagraphs,
    );
    this.showSuggestions([]);
  }

  /**
   * Zeigt eine Antwort: die Frage (bei der Begrüßung keine), die Absätze des Texts (getrennt durch
   * Leerzeilen, ohne Trennstellen-Zeichen) und die Folgefragen. Nach einer Frage holt sie die
   * Antwort ins Bild, falls ihr Anfang nicht gut zu sehen ist.
   */
  public showAnswer(
    question: string | undefined,
    answer: { readonly text: string; readonly suggestions?: readonly string[] },
  ): void {
    const { area } = this.parts;
    this.answerParagraphs = withoutBreakMarks(answer.text)
      .split(/\n\s*\n/)
      .map((text) => text.trim())
      .filter((text) => text !== "")
      .map((text) => this.paragraph("answer", text));
    const questionParagraph =
      question === undefined ? [] : [this.paragraph("question", `Ihre Frage: ${question}`)];

    area.hidden = false;
    area.classList.toggle("waiting", false);
    area.replaceChildren(...questionParagraph, ...this.answerParagraphs);
    this.showSuggestions(answer.suggestions ?? []);
    if (question !== undefined) this.revealIfHidden();
  }

  private paragraph(className: string, text: string): Element {
    const paragraph = this.parts.document.createElement("p");
    paragraph.className = className;
    paragraph.textContent = text;
    return paragraph;
  }

  private showSuggestions(questions: readonly string[]): void {
    const { suggestions, questionInput } = this.parts;
    suggestions.replaceChildren(
      ...questions.map((question) => {
        const button = this.parts.document.createElement("button");
        button.setAttribute("type", "button");
        button.textContent = question;
        button.addEventListener("click", () => {
          questionInput.value = question;
          questionInput.focus();
        });
        return button;
      }),
    );
    suggestions.hidden = questions.length === 0;
  }

  /** Scrollt zur Antwort, wenn ihr Anfang über dem Fenster oder zu weit unten liegt (Q32). */
  private revealIfHidden(): void {
    const top = this.parts.areaTop();
    const isWellVisible = top >= 0 && top <= this.parts.viewportHeight() * WELL_VISIBLE_SHARE;
    if (!isWellVisible) this.parts.scrollToArea();
  }
}
