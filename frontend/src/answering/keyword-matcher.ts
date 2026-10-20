/** Ein Eintrag der Antwort-Tabelle: Passt eines der Stichwörter zur Frage, gilt die Antwort. */
export interface KeywordEntry {
  readonly keywords: readonly string[];
  readonly answer: string;
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
 * Stichwort als ganzes Wort (oder ganze Wortfolge) in der Frage vorkommt. Groß- und
 * Kleinschreibung und Satzzeichen sind egal; "hi" passt deshalb nicht auf "Schiff".
 */
export class KeywordMatcher {
  public constructor(private readonly entries: readonly KeywordEntry[]) {}

  /** Die Antwort des ersten passenden Eintrags, oder `undefined`, wenn nichts passt. */
  public find(question: string): string | undefined {
    const simplifiedQuestion = simplifyForMatching(question);
    return this.entries.find((entry) =>
      entry.keywords.some((keyword) => simplifiedQuestion.includes(simplifyForMatching(keyword))),
    )?.answer;
  }
}
