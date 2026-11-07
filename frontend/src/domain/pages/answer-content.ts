import type { PictureName } from "../picture/picture";

/**
 * Eine Antwort, deren Stichwort der Lichtpunkt schreibt (ADR 0007). Ohne Stichwort zieht er nur
 * einen Pfad. Ein `\n` im Stichwort ist ein erzwungener Umbruch. `maxLinesPerPage`: wie viele
 * Zeilen höchstens auf einer Seite stehen (ein Stichwort 1, die Begrüßung 2); passen weniger,
 * gelten die.
 */
export interface WrittenAnswer {
  readonly keyword?: string;
  readonly maxLinesPerPage: number;
}

/**
 * Eine Antwort, die der Lichtpunkt als Bild zeichnet. Das `keyword` schreibt er stattdessen, wenn
 * das Bild nicht auf die Seite passt (siehe `placePicture`).
 */
export interface PictureAnswer {
  readonly picture: PictureName;
  readonly keyword?: string;
}

/** Die Fotos, die auf einer Labyrinth-Seite liegen können. */
export type PhotoName = "chris";

/**
 * Eine Antwort, bei der ein Foto auf der Seite liegt und der Lichtpunkt es umrundet. Das `keyword`
 * schreibt er stattdessen, wenn das Foto nicht auf die Seite passt (siehe `placePhoto`).
 */
export interface PhotoAnswer {
  readonly photo: PhotoName;
  readonly keyword?: string;
}

/** Was der Lichtpunkt für eine Antwort schreibt: ein Stichwort (oder nur einen Pfad), ein Bild oder ein Foto. */
export type AnswerContent = WrittenAnswer | PictureAnswer | PhotoAnswer;
