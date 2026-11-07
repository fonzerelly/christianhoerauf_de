import { describe, expect, it } from "vitest";
import { contentOf } from "./answer-content";

describe("contentOf", () => {
  it("schreibt das Stichwort einer Antwort, eine Zeile je Seite (ADR 0007)", () => {
    expect(contentOf({ text: "Lange Antwort", keyword: "KAFKA" })).toEqual({
      keyword: "KAFKA",
      maxLinesPerPage: 1,
    });
  });

  it("zieht ohne Stichwort nur einen Pfad", () => {
    expect(contentOf({ text: "Allgemeine Antwort" })).toEqual({ maxLinesPerPage: 1 });
  });

  it("erlaubt mehr Zeilen je Seite, wenn verlangt (Begrüßung)", () => {
    expect(contentOf({ text: "Hallo,", keyword: "Hallo\nFrau Muster" }, 2)).toEqual({
      keyword: "Hallo\nFrau Muster",
      maxLinesPerPage: 2,
    });
  });

  it("macht aus dem Herz-Gimmick ein Herz, mit dem Stichwort für den Fall, dass es nicht passt", () => {
    expect(contentOf({ text: "<3", keyword: "HERZ", gimmick: { type: "heart" } })).toEqual({
      picture: "heart",
      keyword: "HERZ",
    });
  });

  it("macht aus dem Gimmick mit der Hand vor dem Mund den Smiley", () => {
    expect(contentOf({ text: "Ups", gimmick: { type: "face_with_hand_over_mouth" } })).toEqual({
      picture: "face_with_hand_over_mouth",
    });
  });

  it("macht aus dem Foto-Gimmick das Foto von Chris", () => {
    expect(
      contentOf({ text: "Das ist Chris.", keyword: "CHRIS", gimmick: { type: "photo" } }),
    ).toEqual({ photo: "chris", keyword: "CHRIS" });
  });

  it("schreibt bei einem unbekannten Gimmick nur das Stichwort", () => {
    expect(contentOf({ text: "14 Grad", keyword: "WETTER", gimmick: { type: "weather" } })).toEqual(
      { keyword: "WETTER", maxLinesPerPage: 1 },
    );
    expect(contentOf({ text: "Hm", gimmick: { type: "toString" } })).toEqual({
      maxLinesPerPage: 1,
    });
  });
});
