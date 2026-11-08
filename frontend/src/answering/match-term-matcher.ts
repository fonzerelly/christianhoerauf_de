/** Ein Eintrag der Antwort-Tabelle: Passt eines der Suchwörter zur Frage, gilt die Antwort. */
export interface MatchTermEntry {
  readonly matchTerms: readonly string[];
  readonly answer: string;
  /** Das Stichwort, das der Lichtpunkt zu dieser Antwort schreibt (darf fehlen). */
  readonly keyword?: string;
  /** Der Typ eines Gimmicks, etwa `"heart"` (wie `gimmick.type` beim Backend; darf fehlen). */
  readonly gimmick?: string;
}

/**
 * Macht einen Text vergleichbar: Kleinbuchstaben, alles außer Buchstaben und Ziffern wird zu
 * Leerzeichen, vorn und hinten steht genau ein Leerzeichen. Aus "Wer bist du?" wird " wer bist du ".
 * Die Leerzeichen am Rand sorgen dafür, dass nur ganze Wörter gefunden werden.
 */
function simplifyForMatching(text: string): string {
  const words = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
  return ` ${words} `;
}

/**
 * Wählt zu einer Frage die Antwort aus der Tabelle: Der erste Eintrag gewinnt, von dem ein
 * Suchwort als ganzes Wort (oder ganze Wortfolge) in der Frage vorkommt. Groß- und
 * Kleinschreibung und Satzzeichen sind egal; "hi" passt deshalb nicht auf "Schiff".
 */
export class MatchTermMatcher {
  public constructor(private readonly entries: readonly MatchTermEntry[]) {}

  /** Der erste passende Eintrag, oder `undefined`, wenn nichts passt. */
  public find(question: string): MatchTermEntry | undefined {
    const simplifiedQuestion = simplifyForMatching(question);
    return this.entries.find((entry) =>
      entry.matchTerms.some((term) => simplifiedQuestion.includes(simplifyForMatching(term))),
    );
  }
}
