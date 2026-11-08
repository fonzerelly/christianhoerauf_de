import { integerBetween } from "../random/random-choices";
import type { RandomSource } from "../random/random-source";
import type { PhotoName } from "./answer-content";
import { GIMMICK_FREE_ROWS } from "./picture-layout";
import { FREE_COLUMNS_BESIDE_TEXT } from "./text-capacity";

/** Kleiner als so viele Zellen ist auf einem Foto nichts mehr zu erkennen. */
const SMALLEST_PHOTO_SIZE = 6;
/** Der Rahmen, auf dem der Lichtpunkt das Foto umrundet, ist eine Zelle breit. */
const FRAME_WIDTH = 1;
/** Abstand des Fotos zum Rand der Seite: freie Spalten bzw. Reihen und der Rahmen. */
const COLUMN_MARGIN = FREE_COLUMNS_BESIDE_TEXT + FRAME_WIDTH;
const ROW_MARGIN = GIMMICK_FREE_ROWS + FRAME_WIDTH;

/** So viele Reihen braucht das Foto in seiner kleinsten Größe mindestens. */
export const ROWS_NEEDED_FOR_PHOTO = SMALLEST_PHOTO_SIZE + 2 * ROW_MARGIN;

/** Ein Foto und wo es auf der Seite liegt: linke obere Zelle und Kantenlänge in Zellen. */
export interface PlacedPhoto {
  readonly photo: PhotoName;
  readonly left: number;
  readonly top: number;
  readonly size: number;
}

/**
 * Das größte quadratische Foto, das auf die Seite passt (ADR 0007): Um das Foto läuft ein Rahmen
 * von einer Zelle, um den Rahmen bleiben 3 Spalten und 1 Reihe frei. Die Spalte wird gewürfelt,
 * senkrecht liegt es mittig. Würde es kleiner als `SMALLEST_PHOTO_SIZE`, gibt es keins:
 * `undefined`, dann schreibt der Lichtpunkt das Stichwort.
 */
export function placePhoto(
  photo: PhotoName,
  columns: number,
  rows: number,
  random: RandomSource,
): PlacedPhoto | undefined {
  const size = Math.min(rows - 2 * ROW_MARGIN, columns - 2 * COLUMN_MARGIN);
  if (size < SMALLEST_PHOTO_SIZE) return undefined;

  const left = integerBetween(COLUMN_MARGIN, columns - COLUMN_MARGIN - size, random);
  return { photo, left, top: Math.floor((rows - size) / 2), size };
}
