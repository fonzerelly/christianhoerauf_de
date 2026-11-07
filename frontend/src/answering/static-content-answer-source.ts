import type { Answer } from "./answer";
import type { AnswerSource } from "./answer-source";
import { parseContent } from "./content";
import type { Content } from "./content";
import { MatchTermMatcher } from "./match-term-matcher";
import { OFFLINE_KEYWORD } from "./http-answer-source";

/** Die Antwort, wenn der Inhalt nicht zu laden ist. Die Quelle antwortet immer, auch dann. */
export const UNAVAILABLE_ANSWER = "Das klappt gerade nicht. Versuch es später nochmal.";

/**
 * Antwortet aus der statischen Datei `content.json`: mit der Antwort des ersten passenden
 * Suchworts, sonst mit der Standardantwort. Die Datei wird
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
      return this.answerFor(question, content);
    } catch {
      this.content = undefined;
      // Die Datei liegt neben der Seite; lädt sie nicht, ist meist die Verbindung weg.
      return { text: UNAVAILABLE_ANSWER, keyword: OFFLINE_KEYWORD };
    }
  }

  private loadOnce(): Promise<Content> {
    this.content ??= this.loadContent().then(parseContent);
    return this.content;
  }

  private answerFor(question: string, content: Content): Answer {
    const entry = new MatchTermMatcher(content.answers).find(question);
    if (entry === undefined) return { text: content.unknownAnswer };
    return entry.keyword === undefined
      ? { text: entry.answer }
      : { text: entry.answer, keyword: entry.keyword };
  }
}
