import type { PictureName } from "../picture/picture";

/**
 * Eine Antwort, die der Lichtpunkt als Bild zeichnet. `text` schreibt er stattdessen, wenn das
 * Bild nicht auf die Seite passt (siehe `placePicture`).
 */
export interface PictureAnswer {
  readonly picture: PictureName;
  readonly text: string;
}

/** Die Fotos, die auf einer Labyrinth-Seite liegen können. */
export type PhotoName = "chris";

/**
 * Eine Antwort, bei der ein Foto auf der Seite liegt und der Lichtpunkt es umrundet. `text`
 * schreibt er stattdessen, wenn das Foto nicht auf die Seite passt (siehe `placePhoto`).
 */
export interface PhotoAnswer {
  readonly photo: PhotoName;
  readonly text: string;
}

/** Was der Lichtpunkt für eine Antwort schreibt: einen Text, ein Bild oder ein Foto. */
export type AnswerContent = string | PictureAnswer | PhotoAnswer;
