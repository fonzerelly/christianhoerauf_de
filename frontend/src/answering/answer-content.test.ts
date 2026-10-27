import { describe, expect, it } from "vitest";
import { contentOf } from "./answer-content";

describe("contentOf", () => {
  it("macht aus einer Antwort ohne Gimmick ihren Text", () => {
    expect(contentOf({ text: "Hallo" })).toBe("Hallo");
  });

  it("macht aus dem Herz-Gimmick ein Herz, mit dem Text für den Fall, dass es nicht passt", () => {
    expect(contentOf({ text: "<3", gimmick: { type: "heart" } })).toEqual({
      picture: "heart",
      text: "<3",
    });
  });

  it("macht aus dem Gimmick mit der Hand vor dem Mund den Smiley", () => {
    expect(contentOf({ text: "Ups", gimmick: { type: "face_with_hand_over_mouth" } })).toEqual({
      picture: "face_with_hand_over_mouth",
      text: "Ups",
    });
  });

  it("macht aus dem Foto-Gimmick das Foto von Chris", () => {
    expect(contentOf({ text: "Das ist Chris.", gimmick: { type: "photo" } })).toEqual({
      photo: "chris",
      text: "Das ist Chris.",
    });
  });

  it("schreibt bei einem unbekannten Gimmick nur den Text", () => {
    expect(contentOf({ text: "14 Grad", gimmick: { type: "weather" } })).toBe("14 Grad");
    expect(contentOf({ text: "Hm", gimmick: { type: "toString" } })).toBe("Hm");
  });
});
