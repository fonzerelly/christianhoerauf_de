import { readBreakMarks } from "./break-marks";

/**
 * Zerteilt ein Wort, das länger ist als eine Zeile, in Stücke mit Trennstrich.
 *
 * Getrennt wird bevorzugt an einer markierten Trennstelle, und zwar an der spätesten, bei der
 * das Stück samt Trennstrich noch in die Zeile passt. Gibt es keine solche, wird nach Platz
 * getrennt: das Stück füllt die Zeile aus. Ist die Zeile für zwei Buchstaben plus Strich zu
 * kurz, wird ohne Strich zerteilt.
 */
export class Hyphenator {
  public constructor(private readonly maxCharsPerLine: number) {}

  /** Zerlegt ein Wort mit Trennstellen-Zeichen ("INTER|NET") in Stücke; der Strich steht schon dran. */
  public split(markedWord: string): string[] {
    const { letters, breakPositions } = readBreakMarks(markedWord);
    const lettersBesideHyphen = this.maxCharsPerLine - 1;
    const hasRoomForHyphen = lettersBesideHyphen >= 2;
    const hyphen = hasRoomForHyphen ? "-" : "";
    const lettersPerPiece = hasRoomForHyphen ? lettersBesideHyphen : this.maxCharsPerLine;

    const pieces: string[] = [];
    let pieceStart = 0;
    while (letters.length - pieceStart > this.maxCharsPerLine) {
      const fittingBreaks = hasRoomForHyphen
        ? breakPositions.filter(
            (position) => position > pieceStart && position - pieceStart <= lettersBesideHyphen,
          )
        : [];
      const pieceEnd =
        fittingBreaks.length > 0 ? Math.max(...fittingBreaks) : pieceStart + lettersPerPiece;

      pieces.push(letters.slice(pieceStart, pieceEnd) + hyphen);
      pieceStart = pieceEnd;
    }
    pieces.push(letters.slice(pieceStart));
    return pieces;
  }
}
