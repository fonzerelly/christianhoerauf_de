import type { Answer } from "../answering/answer";
import { contentOf } from "../answering/answer-content";
import type { AnswerSource } from "../answering/answer-source";
import type { AnswerContent } from "../domain/pages/answer-content";

/** Die Begrüßung („Hallo / Frau Muster“) darf auf einer Seite zwei Zeilen haben, jedes andere Stichwort eine. */
const GREETING_LINES_PER_PAGE = 2;

/**
 * Der Wechsel von Frage und Antwort: Fragen gehen an die Antwortquelle, die Antwort geht auf die
 * Bühne (ihr Stichwort; ein bekanntes Gimmick als Bild, siehe `contentOf`) und in den
 * Antwortbereich (Frage, Text, Folgefragen). Während gewartet wird, zeigt der Antwortbereich das.
 */
export class Conversation {
  private latestQuestion = 0;

  public constructor(
    private readonly source: AnswerSource,
    private readonly stage: { show(reply: Promise<AnswerContent>): void },
    private readonly answerArea: {
      showWaiting(question: string): void;
      showAnswer(question: string | undefined, answer: Answer): void;
    },
  ) {}

  /**
   * Zeigt die Begrüßung (ADR 0007): Die Seite baut sie selbst aus dem persönlichen Link; die
   * Antwortquelle wird nicht gefragt. Ihr Stichwort darf zwei Zeilen je Seite haben.
   */
  public start(greeting: Answer): void {
    this.present(undefined, Promise.resolve(greeting), GREETING_LINES_PER_PAGE);
  }

  public ask(question: string): void {
    this.answerArea.showWaiting(question);
    this.present(question, this.source.answer(question));
  }

  /** Zeigt die Antwort auf die neueste Frage. Eine ältere, die später eintrifft, wird nicht gezeigt. */
  private present(
    questionText: string | undefined,
    reply: Promise<Answer>,
    maxLinesPerPage = 1,
  ): void {
    this.latestQuestion++;
    const question = this.latestQuestion;
    const content = reply.then((answer) => {
      if (question === this.latestQuestion) this.answerArea.showAnswer(questionText, answer);
      return contentOf(answer, maxLinesPerPage);
    });
    this.stage.show(content);
  }
}
