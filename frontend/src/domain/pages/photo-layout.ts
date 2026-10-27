import { integerBetween } from "../random/random-choices";
import type { RandomSource } from "../random/random-source";
import type { PhotoName } from "./answer-content";
import { FREE_COLUMNS_BESIDE_TEXT, FREE_ROWS_AROUND_TEXT } from "./text-capacity";

/** So viel der kürzeren Seite des Rasters nimmt ein Foto ein. */
const PHOTO_SHARE = 2 / 5;
/** Kleiner als so viele Zellen ist auf einem Foto nichts mehr zu erkennen. */
const SMALLEST_PHOTO_SIZE = 6;
/** Der Rahmen, auf dem der Lichtpunkt das Foto umrundet, ist eine Zelle breit. */
const FRAME_WIDTH = 1;

/** Ein Foto und wo es auf der Seite liegt: linke obere Zelle und Kantenlänge in Zellen. */
export interface PlacedPhoto {
  readonly photo: PhotoName;
  readonly left: number;
  readonly top: number;
  readonly size: number;
}

/**
 * Legt ein quadratisches Foto an eine zufällige Stelle der Seite. Es ist zwei Fünftel so groß wie
 * die kürzere Seite des Rasters (abgerundet). Um das Foto läuft ein Rahmen von einer Zelle, und
 * um den Rahmen bleibt so viel Rand wie um einen Text (3 Spalten, 2 Zeilen), damit An- und Ablauf
 * vorbeikommen. Gezogen wird erst die Spalte, dann die Zeile.
 *
 * Würde das Foto kleiner als `SMALLEST_PHOTO_SIZE`, gibt es keins: `undefined`, dann schreibt
 * der Lichtpunkt den Text. Ein Test prüft, dass ab dieser Größe der Rand immer reicht.
 */
export function placePhoto(
  photo: PhotoName,
  columns: number,
  rows: number,
  random: RandomSource,
): PlacedPhoto | undefined {
  const size = Math.floor(Math.min(columns, rows) * PHOTO_SHARE);
  if (size < SMALLEST_PHOTO_SIZE) return undefined;

  const columnMargin = FREE_COLUMNS_BESIDE_TEXT + FRAME_WIDTH;
  const rowMargin = FREE_ROWS_AROUND_TEXT + FRAME_WIDTH;
  const left = integerBetween(columnMargin, columns - columnMargin - size, random);
  const top = integerBetween(rowMargin, rows - rowMargin - size, random);
  return { photo, left, top, size };
}
