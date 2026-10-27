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
 * Was der Lichtpunkt für die Antwort schreibt: Kennt das Frontend ihr Gimmick, das Bild bzw. das
 * Foto (samt Text, falls es nicht auf die Seite passt), sonst nur den Text.
 */
export function contentOf(answer: Answer): AnswerContent {
  const type = answer.gimmick?.type;
  if (type === undefined) return answer.text;

  const picture = PICTURE_OF_GIMMICK.get(type);
  if (picture !== undefined) return { picture, text: answer.text };
  const photo = PHOTO_OF_GIMMICK.get(type);
  if (photo !== undefined) return { photo, text: answer.text };
  return answer.text;
}
