import type { Answer } from "./answer";

/**
 * Woher die Antworten kommen. Heute ist es eine Datei, später ein Sprachmodell hinter einer
 * Lambda-Funktion; getauscht wird nur in `main.ts` (ADR 0003).
 */
export interface AnswerSource {
  /**
   * Die Antwort auf eine Frage. Eine leere Frage (`""`) liefert die Begrüßung. Das Versprechen
   * wird immer eingelöst: Kann die Quelle nicht antworten, liefert sie eine Antwort, die das sagt.
   */
  answer(question: string): Promise<Answer>;
}
