import { itemAt, lastOf } from "../lists";
import { Hyphenator } from "./hyphenator";
import { withoutBreakMarks } from "./break-marks";

/**
 * Bricht einen aufbereiteten Text an Wortgrenzen in Zeilen um.
 *
 * - Wörter, die in eine Zeile passen, werden nie getrennt.
 * - Ein längeres Wort wird mit Trennstrich zerteilt (siehe `Hyphenator`).
 * - Kein Zeichen steht allein in einer Zeile, wenn sich das vermeiden lässt.
 * - Die fertigen Zeilen enthalten keine Trennstellen-Zeichen mehr.
 */
export class LineWrapper {
  private readonly hyphenator: Hyphenator;

  public constructor(private readonly maxCharsPerLine: number) {
    this.hyphenator = new Hyphenator(maxCharsPerLine);
  }

  public wrap(text: string): string[] {
    const lines: string[] = [];
    let currentLine = "";

    const markedWords = text.split(" ").filter((word) => withoutBreakMarks(word) !== "");
    for (const markedWord of markedWords) {
      let word = withoutBreakMarks(markedWord);
      if (word.length > this.maxCharsPerLine) {
        const pieces = this.hyphenator.split(markedWord);
        if (currentLine) lines.push(currentLine);
        lines.push(...pieces.slice(0, -1));
        word = lastOf(pieces);
        currentLine = "";
      }
      const candidate = currentLine ? `${currentLine} ${word}` : word;
      if (candidate.length <= this.maxCharsPerLine) {
        currentLine = candidate;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);

    return this.avoidLonelyCharacters(lines);
  }

  /**
   * Verhindert Zeilen, die nur aus einem Zeichen bestehen (z. B. die "8" von "8 JAHRE"):
   * Das letzte Wort der Zeile davor rutscht mit hinunter. Das geschieht nur, wenn die Zeile
   * davor mehr als ein Wort hat und nicht auf einen Bindestrich endet.
   */
  private avoidLonelyCharacters(lines: string[]): string[] {
    for (let index = 1; index < lines.length; index++) {
      const line = itemAt(lines, index);
      const lineBefore = itemAt(lines, index - 1);
      const wordsBefore = lineBefore.split(" ");
      const canBorrowWord = wordsBefore.length >= 2 && !lineBefore.endsWith("-");

      if (line.length === 1 && canBorrowWord) {
        lines[index] = `${lastOf(wordsBefore)} ${line}`;
        lines[index - 1] = wordsBefore.slice(0, -1).join(" ");
      }
    }
    return lines;
  }
}
