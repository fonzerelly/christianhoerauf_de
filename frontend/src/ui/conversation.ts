import type { Answer } from "../answering/answer";
import type { AnswerSource } from "../answering/answer-source";

/**
 * Der Wechsel von Frage und Antwort: Fragen gehen an die Antwortquelle, der Text der Antwort geht
 * auf die Bühne (zum Schreiben) und an den Screenreader (zum Vorlesen). Ein Gimmick der Antwort
 * zeigt das Frontend noch nicht; es schreibt immer den Text.
 */
export class Conversation {
  private latestQuestion = 0;
  private lastAnswer: Answer | undefined;

  public constructor(
    private readonly source: AnswerSource,
    private readonly stage: { show(reply: Promise<string>): void },
    private readonly spoken: { show(text: string): void },
  ) {}

  /** Holt die Begrüßung: Die Quelle liefert sie auf eine leere Frage. */
  public start(): void {
    this.present(this.source.answer(""));
  }

  public ask(question: string): void {
    this.present(this.source.answer(question));
  }

  /** Schreibt die zuletzt eingetroffene Antwort noch einmal, wie eine neue. Ohne Antwort passiert nichts. */
  public replay(): void {
    if (this.lastAnswer !== undefined) this.present(Promise.resolve(this.lastAnswer));
  }

  /** Zeigt die Antwort auf die neueste Frage. Eine ältere, die später eintrifft, wird nicht vorgelesen. */
  private present(reply: Promise<Answer>): void {
    this.latestQuestion++;
    const question = this.latestQuestion;
    const text = reply.then((answer) => {
      if (question === this.latestQuestion) {
        this.lastAnswer = answer;
        this.spoken.show(answer.text);
      }
      return answer.text;
    });
    this.stage.show(text);
  }
}
