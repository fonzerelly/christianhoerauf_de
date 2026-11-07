import type { AnswerContent, PhotoName } from "../domain/pages/answer-content";
import type { PictureName } from "../domain/picture/picture";
import type { Answer } from "./answer";

/** Die Gimmicks, die das Frontend als Bild zeichnen kann (ADR 0003, Nachtrag 2026-10-27). */
const PICTURE_OF_GIMMICK: ReadonlyMap<string, PictureName> = new Map([
  ["heart", "heart"],
  ["face_with_hand_over_mouth", "face_with_hand_over_mouth"],
]);

/** Die Gimmicks, für die ein Foto auf der Seite liegt (ADR 0003, Nachtrag 2026-10-28). */
const PHOTO_OF_GIMMICK: ReadonlyMap<string, PhotoName> = new Map([["photo", "chris"]]);

/**
 * Was der Lichtpunkt für die Antwort schreibt (ADR 0007): ihr Stichwort, ohne Stichwort nur einen
 * Pfad. Kennt das Frontend ihr Gimmick, das Bild bzw. das Foto, mit dem Stichwort für den Fall,
 * dass es nicht auf die Seite passt. `maxLinesPerPage`: wie viele Zeilen des Stichworts höchstens
 * auf einer Seite stehen (1; die Begrüßung 2).
 */
export function contentOf(answer: Answer, maxLinesPerPage = 1): AnswerContent {
  const keyword = answer.keyword === undefined ? {} : { keyword: answer.keyword };
  const type = answer.gimmick?.type;
  const picture = type === undefined ? undefined : PICTURE_OF_GIMMICK.get(type);
  if (picture !== undefined) return { picture, ...keyword };
  const photo = type === undefined ? undefined : PHOTO_OF_GIMMICK.get(type);
  if (photo !== undefined) return { photo, ...keyword };
  return { ...keyword, maxLinesPerPage };
}
