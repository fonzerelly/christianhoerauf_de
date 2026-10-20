import type { Answer } from "./answer";
import type { AnswerSource } from "./answer-source";
import { parseContent } from "./content";
import type { Content } from "./content";
import { KeywordMatcher } from "./keyword-matcher";

/** Die Antwort, wenn der Inhalt nicht zu laden ist. Die Quelle antwortet immer, auch dann. */
export const UNAVAILABLE_ANSWER = "Das klappt gerade nicht. Versuch es später nochmal.";

/**
 * Antwortet aus der statischen Datei `content.json`: auf eine leere Frage mit der Begrüßung, sonst
 * mit der Antwort des ersten passenden Stichworts, sonst mit der Standardantwort. Die Datei wird
 * beim ersten Mal geladen und dann behalten; schlägt das Laden fehl, wird es bei der nächsten Frage
 * erneut versucht.
 */
export class StaticContentAnswerSource implements AnswerSource {
  private content: Promise<Content> | undefined;

  /** `loadContent` liefert den rohen JSON-Inhalt der Datei. */
  public constructor(private readonly loadContent: () => Promise<unknown>) {}

  public async answer(question: string): Promise<Answer> {
    try {
      const content = await this.loadOnce();
      return { text: this.textFor(question, content) };
    } catch {
      this.content = undefined;
      return { text: UNAVAILABLE_ANSWER };
    }
  }

  private loadOnce(): Promise<Content> {
    this.content ??= this.loadContent().then(parseContent);
    return this.content;
  }

  private textFor(question: string, content: Content): string {
    if (question === "") return content.greeting;
    return new KeywordMatcher(content.answers).find(question) ?? content.unknownAnswer;
  }
}
