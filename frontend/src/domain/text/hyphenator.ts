import { widthInCharacters } from "../font/text-width";
import { readBreakMarks } from "./break-marks";

/**
 * Wo ein Stück endet, das die Zeile ausfüllt: so spät wie möglich, aber mindestens ein Zeichen
 * hinter `start`, auch wenn dieses (die Ersatzglyphe) allein breiter ist als `width`.
 */
function fillingPieceEnd(letters: string, start: number, width: number): number {
  let end = start + 1;
  while (end < letters.length && widthInCharacters(letters.slice(start, end + 1)) <= width) end++;
  return end;
}

/**
 * Zerteilt ein Wort, das länger ist als eine Zeile, in Stücke mit Trennstrich.
 *
 * Getrennt wird bevorzugt an einer markierten Trennstelle, und zwar an der spätesten, bei der
 * das Stück samt Trennstrich noch in die Zeile passt. Gibt es keine solche, wird nach Platz
 * getrennt: das Stück füllt die Zeile aus. Ist die Zeile für zwei Buchstaben plus Strich zu
 * kurz, wird ohne Strich zerteilt. Gemessen wird in Zeichenbreiten (`widthInCharacters`): Die
 * Ersatzglyphe belegt zwei.
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
    while (widthInCharacters(letters.slice(pieceStart)) > this.maxCharsPerLine) {
      const fittingBreaks = hasRoomForHyphen
        ? breakPositions.filter(
            (position) =>
              position > pieceStart &&
              widthInCharacters(letters.slice(pieceStart, position)) <= lettersBesideHyphen,
          )
        : [];
      const pieceEnd =
        fittingBreaks.length > 0
          ? Math.max(...fittingBreaks)
          : fillingPieceEnd(letters, pieceStart, lettersPerPiece);

      pieces.push(letters.slice(pieceStart, pieceEnd) + hyphen);
      pieceStart = pieceEnd;
    }
    // ein Rest bleibt nur übrig, wenn das letzte Stück nicht schon alles aufgebraucht hat
    if (pieceStart < letters.length) pieces.push(letters.slice(pieceStart));
    return pieces;
  }
}
