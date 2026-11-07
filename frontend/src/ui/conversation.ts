import type { Answer } from "../answering/answer";
import { contentOf } from "../answering/answer-content";
import type { AnswerSource } from "../answering/answer-source";
import type { AnswerContent } from "../domain/pages/answer-content";

/**
 * Der Wechsel von Frage und Antwort: Fragen gehen an die Antwortquelle, die Antwort geht auf die
 * Bühne (zum Schreiben; ein bekanntes Gimmick als Bild, siehe `contentOf`) und ihr Text an den
 * Screenreader (zum Vorlesen).
 */
/** Die Begrüßung („Hallo / Frau Muster“) darf auf einer Seite zwei Zeilen haben, jedes andere Stichwort eine. */
const GREETING_LINES_PER_PAGE = 2;

export class Conversation {
  private latestQuestion = 0;

  public constructor(
    private readonly source: AnswerSource,
    private readonly stage: { show(reply: Promise<AnswerContent>): void },
    private readonly spoken: { show(text: string): void },
  ) {}

  /**
   * Zeigt die Begrüßung (ADR 0007): Die Seite baut sie selbst aus dem persönlichen Link; die
   * Antwortquelle wird nicht gefragt. Ihr Stichwort darf zwei Zeilen je Seite haben.
   */
  public start(greeting: Answer): void {
    this.present(Promise.resolve(greeting), GREETING_LINES_PER_PAGE);
  }

  public ask(question: string): void {
    this.present(this.source.answer(question));
  }

  /** Zeigt die Antwort auf die neueste Frage. Eine ältere, die später eintrifft, wird nicht vorgelesen. */
  private present(reply: Promise<Answer>, maxLinesPerPage = 1): void {
    this.latestQuestion++;
    const question = this.latestQuestion;
    const content = reply.then((answer) => {
      if (question === this.latestQuestion) this.spoken.show(answer.text);
      return contentOf(answer, maxLinesPerPage);
    });
    this.stage.show(content);
  }
}
