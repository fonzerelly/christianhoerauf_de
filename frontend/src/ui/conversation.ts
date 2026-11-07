import type { Answer } from "../answering/answer";
import { contentOf } from "../answering/answer-content";
import type { AnswerSource } from "../answering/answer-source";
import type { AnswerContent } from "../domain/pages/answer-content";

/**
 * Der Wechsel von Frage und Antwort: Fragen gehen an die Antwortquelle, die Antwort geht auf die
 * Bühne (zum Schreiben; ein bekanntes Gimmick als Bild, siehe `contentOf`) und ihr Text an den
 * Screenreader (zum Vorlesen).
 */
export class Conversation {
  private latestQuestion = 0;

  public constructor(
    private readonly source: AnswerSource,
    private readonly stage: { show(reply: Promise<AnswerContent>): void },
    private readonly spoken: { show(text: string): void },
  ) {}

  /** Holt die Begrüßung: Die Quelle liefert sie auf eine leere Frage. */
  public start(): void {
    this.present(this.source.answer(""));
  }

  public ask(question: string): void {
    this.present(this.source.answer(question));
  }

  /** Zeigt die Antwort auf die neueste Frage. Eine ältere, die später eintrifft, wird nicht vorgelesen. */
  private present(reply: Promise<Answer>): void {
    this.latestQuestion++;
    const question = this.latestQuestion;
    const content = reply.then((answer) => {
      if (question === this.latestQuestion) this.spoken.show(answer.text);
      return contentOf(answer);
    });
    this.stage.show(content);
  }
}
