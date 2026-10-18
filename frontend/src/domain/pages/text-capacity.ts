import { CHAR_ADVANCE } from "../font/glyph";
import { lineAdvanceOf } from "../route/text-block-layout";

/**
 * Wie viel Platz rund um den Textblock mindestens frei bleibt.
 * Neben dem Text: eine Spalte für die Zeilenwechsel, eine für das Tor, eine Luft zum Rand.
 * Über und unter dem Text: zwei Zeilen, durch die An- und Ablauf am Text vorbeikommen.
 */
const FREE_COLUMNS_BESIDE_TEXT = 3;
const FREE_ROWS_AROUND_TEXT = 2;

/** Wie viel Text auf eine Labyrinth-Seite passt. */
export interface TextCapacity {
  readonly charsPerLine: number;
  readonly linesPerPage: number;
}

/**
 * Wie viele Zeichen in eine Zeile und wie viele Zeilen auf eine Seite eines Rasters passen.
 * `returnBandRows` ist die Höhe des Bands für den Zeilenwechsel. Es passt immer mindestens ein
 * Zeichen in eine Zeile und eine Zeile auf eine Seite.
 */
export function textCapacityOf(
  columns: number,
  rows: number,
  returnBandRows: number,
): TextCapacity {
  const usableColumns = columns - 2 * FREE_COLUMNS_BESIDE_TEXT;
  const usableRows = rows - 2 * FREE_ROWS_AROUND_TEXT;
  return {
    // "+ 1": hinter dem letzten Zeichen entfällt der Abstand
    charsPerLine: Math.max(1, Math.floor((usableColumns + 1) / CHAR_ADVANCE)),
    // "+ returnBandRows": unter der letzten Zeile entfällt das Band für den Zeilenwechsel
    linesPerPage: Math.max(
      1,
      Math.floor((usableRows + returnBandRows) / lineAdvanceOf(returnBandRows)),
    ),
  };
}
