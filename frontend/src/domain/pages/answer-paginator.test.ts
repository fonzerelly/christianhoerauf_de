import { describe, expect, it } from "vitest";
import { itemAt } from "../lists";
import { createDefaultFont } from "../font/font";
import { Mulberry32 } from "../random/mulberry32";
import type { Gate } from "../route/gate";
import { TextNormalizer } from "../text/text-normalizer";
import { AnswerPaginator } from "./answer-paginator";

const SETTINGS = {
  columns: 34,
  rows: 60,
  restingDistance: 2,
  maze: { windiness: 0.7, detour: 0.3, returnBandRows: 2, returnWindiness: 0.5, maxWallRun: 4 },
};

function createPaginator(settings = SETTINGS): AnswerPaginator {
  const font = createDefaultFont();
  return new AnswerPaginator(
    font,
    new TextNormalizer(font, () => undefined),
    (seed) => new Mulberry32(seed),
    settings,
  );
}

describe("AnswerPaginator", () => {
  it("schreibt eine kurze Antwort auf eine Seite", () => {
    const { pages } = createPaginator().paginate("Hallo", 1);

    expect(pages).toHaveLength(1);
    expect(pages[0]?.lines).toEqual(["HALLO"]);
  });

  it("bereitet die Antwort auf, bevor sie umgebrochen wird", () => {
    const { pages } = createPaginator().paginate("gut, und dir?", 1);

    expect(pages.flatMap((page) => page.lines)).toEqual(["GUT UND", "DIR?"]);
  });

  it("verteilt eine lange Antwort auf mehrere Seiten mit höchstens so vielen Zeilen, wie passen", () => {
    const longAnswer =
      "Das ist ein langer Platzhalter-Text zum Ausprobieren mehrerer Seiten und noch viel mehr";

    const { pages } = createPaginator().paginate(longAnswer, 1);

    expect(pages.length).toBeGreaterThan(1);
    for (const page of pages) expect(page.lines.length).toBeLessThanOrEqual(7);
  });

  it("legt den Eingang jeder Folgeseite genau gegenüber den Ausgang der vorigen", () => {
    const { pages } = createPaginator().paginate(
      "Das ist ein langer Platzhalter-Text zum Ausprobieren mehrerer Seiten und noch viel mehr",
      3,
    );

    expect(pages.length).toBeGreaterThan(1);
    pages.slice(1).forEach((page, index) => {
      const previousExit = itemAt(pages, index).exit;
      const opposite = { right: "left", left: "right", top: "bottom", bottom: "top" }[
        previousExit.side
      ];
      expect(page.entrance.side).toBe(opposite);
      if (opposite === "left" || opposite === "right")
        expect(page.entrance.cell.y).toBe(previousExit.cell.y);
      else expect(page.entrance.cell.x).toBe(previousExit.cell.x);
    });
  });

  it("schließt die erste Seite an den Ausgang der vorigen Antwort an", () => {
    const exitBefore: Gate = { cell: { x: 33, y: 12 }, side: "right" };

    const { pages } = createPaginator().paginate("Hallo", 1, exitBefore);

    expect(pages[0]?.entrance).toEqual({ cell: { x: 0, y: 12 }, side: "left" });
  });

  it("wählt den Eingang der ersten Seite aus dem Startwert, wenn es keine vorige Antwort gibt", () => {
    const { pages } = createPaginator().paginate("Hallo", 1);

    expect(["left", "top", "bottom"]).toContain(pages[0]?.entrance.side);
  });

  it("liefert mit demselben Startwert dasselbe und mit einem anderen etwas anderes", () => {
    const first = createPaginator().paginate("Hallo", 7);

    expect(createPaginator().paginate("Hallo", 7)).toEqual(first);
    expect(createPaginator().paginate("Hallo", 8).pages[0]?.route).not.toEqual(
      first.pages[0]?.route,
    );
  });

  it("legt den Haltepunkt zwei Wegstücke hinter das Ende der letzten Glyphe der letzten Seite", () => {
    const { pages, restingStepIndex } = createPaginator().paginate(
      "Hallo Welt wie geht es dir heute",
      2,
    );

    const lastPage = pages[pages.length - 1];
    expect(restingStepIndex).toBe((lastPage?.lastGlyphEnd ?? -99) + 2);
    expect(lastPage?.route[restingStepIndex]).toBeDefined();
  });

  it("richtet den Haltepunkt nach dem eingestellten Abstand", () => {
    const near = createPaginator({ ...SETTINGS, restingDistance: 1 }).paginate("Hallo", 2);
    const far = createPaginator({ ...SETTINGS, restingDistance: 3 }).paginate("Hallo", 2);

    expect(far.restingStepIndex - near.restingStepIndex).toBe(2);
  });

  it("nennt den Haltepunkt für jede beliebige Seite, auch eine mitten in der Antwort", () => {
    const paginator = createPaginator();
    const { pages, restingStepIndex } = paginator.paginate(
      "Das ist ein langer Platzhalter-Text zum Ausprobieren mehrerer Seiten und noch viel mehr",
      1,
    );

    expect(pages.length).toBeGreaterThan(1);
    const firstPage = itemAt(pages, 0);
    expect(paginator.restingStepOf(firstPage)).toBe(firstPage.lastGlyphEnd + 2);
    expect(paginator.restingStepOf(itemAt(pages, pages.length - 1))).toBe(restingStepIndex);
  });

  it("liefert in Stücken dasselbe wie `paginate` und pausiert zweimal je Seite", () => {
    const answer =
      "Das ist ein langer Platzhalter-Text zum Ausprobieren mehrerer Seiten und noch viel mehr";
    const steps = createPaginator().paginateInSteps(answer, 3);

    let pauses = 0;
    let step = steps.next();
    while (step.done !== true) {
      pauses++;
      step = steps.next();
    }

    const expected = createPaginator().paginate(answer, 3);
    expect(expected.pages.length).toBeGreaterThan(1);
    expect(pauses).toBe(2 * expected.pages.length);
    expect(step.value).toEqual(expected);
  });

  describe("mit einem Bild", () => {
    const HEART = { picture: "heart", text: "<3" } as const;

    it("zeichnet das Bild auf eine einzige Seite ohne Zeilen", () => {
      const { pages, restingStepIndex } = createPaginator().paginate(HEART, 1);
      const page = itemAt(pages, 0);

      expect(pages).toHaveLength(1);
      expect(page.lines).toEqual([]);
      expect(page.route.filter(({ kind }) => kind === "letter").length).toBeGreaterThan(40);
      expect(restingStepIndex).toBe(page.lastGlyphEnd + 2);
    });

    it("schließt auch ein Bild an den Ausgang der vorigen Antwort an", () => {
      const exitBefore: Gate = { cell: { x: 33, y: 12 }, side: "right" };

      const { pages } = createPaginator().paginate(HEART, 1, exitBefore);

      expect(pages[0]?.entrance).toEqual({ cell: { x: 0, y: 12 }, side: "left" });
    });

    it("schreibt den Text, wenn das Bild nicht auf die Seite passt", () => {
      const small = { ...SETTINGS, columns: 20, rows: 14 };

      const { pages } = createPaginator(small).paginate(
        { picture: "face_with_hand_over_mouth", text: "Ups" },
        1,
      );

      expect(pages.flatMap((page) => page.lines)).toEqual(["UPS"]);
    });
  });

  describe("mit einem Foto", () => {
    const CHRIS = { photo: "chris", text: "Das ist Chris." } as const;

    it("legt das Foto auf eine einzige Seite ohne Zeilen; der Haltepunkt liegt hinter der letzten Runde", () => {
      const { pages, restingStepIndex } = createPaginator().paginate(CHRIS, 1);
      const page = itemAt(pages, 0);

      expect(pages).toHaveLength(1);
      expect(page.lines).toEqual([]);
      // zwei Fünftel von 34 Spalten
      expect(page.photo?.size).toBe(13);
      expect(page.photo?.lapEnds).toHaveLength(3);
      expect(restingStepIndex).toBe(page.lastGlyphEnd + 2);
    });

    it("legt das Foto je nach Startwert an eine andere Stelle", () => {
      const places = new Set(
        [1, 2, 3, 4, 5].map((seed) => {
          const photo = createPaginator().paginate(CHRIS, seed).pages[0]?.photo;
          return `${String(photo?.left)},${String(photo?.top)}`;
        }),
      );

      expect(places.size).toBeGreaterThan(1);
    });

    it("schließt auch ein Foto an den Ausgang der vorigen Antwort an", () => {
      const exitBefore: Gate = { cell: { x: 33, y: 12 }, side: "right" };

      const { pages } = createPaginator().paginate(CHRIS, 1, exitBefore);

      expect(pages[0]?.entrance).toEqual({ cell: { x: 0, y: 12 }, side: "left" });
    });

    it("schreibt den Text, wenn das Foto nicht auf die Seite passt", () => {
      const small = { ...SETTINGS, columns: 40, rows: 14 };

      const { pages } = createPaginator(small).paginate(CHRIS, 1);

      expect(pages.flatMap((page) => page.lines)).toEqual(["DAS IST", "CHRIS."]);
      expect(pages[0]?.photo).toBeUndefined();
    });
  });
});
