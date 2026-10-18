/**
 * Das Trennstellen-Zeichen: Es markiert in einem Text, wo ein Wort bevorzugt getrennt werden
 * soll ("INTER|NET|PRÄ|SENZ"). Es wird nie angezeigt und zählt nicht als Buchstabe.
 */
export const BREAK_MARK = "|";

/** Entfernt alle Trennstellen-Zeichen: aus "PRO|TO|TYP" wird "PROTOTYP". */
export function withoutBreakMarks(text: string): string {
  return text.split(BREAK_MARK).join("");
}

/** Ein Wort ohne Trennstellen-Zeichen und die Stellen, an denen es getrennt werden darf. */
export interface MarkedWord {
  readonly letters: string;
  /** Vor dem wievielten Buchstaben getrennt werden darf. */
  readonly breakPositions: readonly number[];
}

/** Liest die Trennstellen eines Worts aus: "PRO|TO|TYP" ergibt `PROTOTYP` mit den Stellen 3 und 5. */
export function readBreakMarks(word: string): MarkedWord {
  const breakPositions: number[] = [];
  let letters = "";
  for (const character of word) {
    if (character === BREAK_MARK) breakPositions.push(letters.length);
    else letters += character;
  }
  return { letters, breakPositions };
}
