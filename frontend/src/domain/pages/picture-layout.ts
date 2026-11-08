import { drawPicture, SMALLEST_SIZE } from "../picture/picture";
import type { Picture, PictureName } from "../picture/picture";
import { ROWS_BELOW_PICTURE } from "../route/route-builder";
import { FREE_COLUMNS_BESIDE_TEXT } from "./text-capacity";

/**
 * So viele Reihen bleiben über und unter einem Gimmick frei (beim Text sind es 2). Der Lichtpunkt
 * kommt von der Seite, auf Höhe der untersten Reihe des Gimmicks (ADR 0007, Prototyp 12).
 */
export const GIMMICK_FREE_ROWS = 1;

/** Ein Bild und wo sein Feld auf der Seite liegt (linke obere Zelle). */
export interface PlacedPicture {
  readonly picture: Picture;
  readonly left: number;
  readonly top: number;
}

/** So viele Reihen braucht ein Bild samt Anlauf darunter und freien Reihen. */
function rowsFor(picture: Picture): number {
  return picture.height + ROWS_BELOW_PICTURE + 2 * GIMMICK_FREE_ROWS;
}

/** So viele Reihen braucht ein Bild in seiner kleinsten Größe mindestens (Herz 15, Smiley 22). */
export function rowsNeededForPicture(name: PictureName): number {
  return rowsFor(drawPicture(name, SMALLEST_SIZE[name]));
}

/**
 * Das größte Bild, das auf die Seite passt (ADR 0007): ungerade Breite (damit es eine mittlere
 * Spalte gibt), höchstens so breit wie die Seite ohne je 3 Spalten Rand, und samt
 * `ROWS_BELOW_PICTURE` Zeilen für An- und Ablauf und je einer freien Reihe darüber und darunter
 * nicht höher als die Seite. Waagrecht und senkrecht mittig. Würde es kleiner als seine kleinste
 * Größe (`SMALLEST_SIZE`), gibt es keins: `undefined`.
 */
export function placePicture(
  name: PictureName,
  columns: number,
  rows: number,
): PlacedPicture | undefined {
  // Jedes Bild ist mindestens halb so hoch wie breit (Herz 0,9, Smiley 1): Breiter als die doppelte
  // Höhe des Rasters kann es nicht werden. So zeichnet die Suche nur Größen, die in Frage kommen.
  const widest = Math.min(columns - 2 * FREE_COLUMNS_BESIDE_TEXT, 2 * rows);
  for (
    let width = widest % 2 === 1 ? widest : widest - 1;
    width >= SMALLEST_SIZE[name];
    width -= 2
  ) {
    const picture = drawPicture(name, width);
    if (rowsFor(picture) <= rows) {
      const blockHeight = picture.height + ROWS_BELOW_PICTURE;
      return {
        picture,
        left: Math.floor((columns - picture.width) / 2),
        top: Math.floor((rows - blockHeight) / 2),
      };
    }
  }
  return undefined;
}
