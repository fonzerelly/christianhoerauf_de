import { drawPicture, SMALLEST_SIZE } from "../picture/picture";
import type { Picture, PictureName } from "../picture/picture";
import { ROWS_BELOW_PICTURE } from "../route/route-builder";

/** So viel der kürzeren Seite des Rasters nimmt ein Bild ein. */
const PICTURE_SHARE = 2 / 3;

/** Ein Bild und wo sein Feld auf der Seite liegt (linke obere Zelle). */
export interface PlacedPicture {
  readonly picture: Picture;
  readonly left: number;
  readonly top: number;
}

/**
 * Zeichnet das Bild so groß, dass es etwa zwei Drittel der kürzeren Seite des Rasters einnimmt
 * (abgerundet auf eine ungerade Zahl, damit es eine mittlere Spalte gibt), und setzt es samt der
 * Zeilen für An- und Ablauf darunter (`ROWS_BELOW_PICTURE`) in die Mitte. Würde es kleiner als
 * seine kleinste Größe (`SMALLEST_SIZE`), gibt es kein Bild: `undefined`, dann schreibt der
 * Lichtpunkt den Text.
 *
 * Um das Bild bleibt dann immer mindestens so viel Rand wie um einen Text (3 Spalten, 2 Zeilen),
 * denn bei zwei Dritteln bleibt ein Sechstel je Seite, und ab der kleinsten Größe ist das genug.
 * Ein Test prüft das für alle üblichen Raster.
 */
export function placePicture(
  name: PictureName,
  columns: number,
  rows: number,
): PlacedPicture | undefined {
  const largest = Math.floor(Math.min(columns, rows) * PICTURE_SHARE);
  const size = largest % 2 === 1 ? largest : largest - 1;
  if (size < SMALLEST_SIZE[name]) return undefined;

  const picture = drawPicture(name, size);
  const blockHeight = picture.height + ROWS_BELOW_PICTURE;
  return {
    picture,
    left: Math.floor((columns - picture.width) / 2),
    top: Math.floor((rows - blockHeight) / 2),
  };
}
