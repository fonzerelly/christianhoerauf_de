import { describe, expect, it } from "vitest";
import { itemAt } from "../lists";
import { createDefaultFont } from "../font/font";
import { Mulberry32 } from "../random/mulberry32";
import { gateInGrid } from "../route/gate";
import type { Gate } from "../route/gate";
import { TextNormalizer } from "../text/text-normalizer";
import { AnswerPaginator } from "./answer-paginator";
import type { PaginatorSettings } from "./answer-paginator";

const SETTINGS = {
  columns: 34,
  rows: 60,
  restingDistance: 2,
  maze: { windiness: 0.7, detour: 0.3, returnBandRows: 2, returnWindiness: 0.5, maxWallRun: 4 },
};

function createPaginator(settings: PaginatorSettings = SETTINGS): AnswerPaginator {
  const font = createDefaultFont();
  return new AnswerPaginator(
    font,
    new TextNormalizer(font, () => undefined),
    (seed) => new Mulberry32(seed),
    settings,
  );
}

/** Eine Antwort, deren Stichwort der Lichtpunkt schreibt; die Begrüßung darf zwei Zeilen je Seite. */
function written(keyword: string | undefined, maxLinesPerPage = 1) {
  return keyword === undefined ? { maxLinesPerPage } : { keyword, maxLinesPerPage };
}

const LONG = written("Das ist ein langes Stichwort für mehrere Seiten");

/** Die Spalte, in der der erste Schriftweg einer Seite beginnt (zeigt, wo der Text steht). */
function firstLetterColumn(page: { route: readonly { x: number; kind: string }[] }): number {
  return Math.min(...page.route.filter(({ kind }) => kind === "letter").map(({ x }) => x));
}

describe("AnswerPaginator", () => {
  it("schreibt das Stichwort, aufbereitet, auf eine Seite", () => {
    const { pages } = createPaginator().paginate(written("Kafka"), 1);

    expect(pages).toHaveLength(1);
    expect(pages[0]?.lines).toEqual(["KAFKA"]);
  });

  it("schreibt eine Zeile je Seite; was nicht in eine Zeile passt, kommt auf die nächste Seite", () => {
    const { pages } = createPaginator().paginate(written("gut, und dir?"), 1);

    expect(pages.map((page) => page.lines)).toEqual([["GUT UND"], ["DIR?"]]);
  });

  it("schreibt bis zu so vielen Zeilen je Seite wie erlaubt und wie passen (Begrüßung)", () => {
    const { pages } = createPaginator().paginate(written("Hallo\nFrau Muster", 2), 1);

    expect(pages.map((page) => page.lines)).toEqual([["HALLO", "FRAU"], ["MUSTER"]]);
  });

  it("bricht bei einem \\n um, auch wenn beides in eine Zeile passte", () => {
    const wide = createPaginator({ ...SETTINGS, columns: 60 });

    expect(wide.paginate(written("Hallo\nWelt", 2), 1).pages[0]?.lines).toEqual(["HALLO", "WELT"]);
  });

  it("schreibt nur eine Zeile je Seite, wenn die Bühne für zwei zu niedrig ist", () => {
    const low = createPaginator({ ...SETTINGS, rows: 15 });

    const { pages } = low.paginate(written("Hallo\nWelt", 2), 1);

    expect(pages.map((page) => page.lines)).toEqual([["HALLO"], ["WELT"]]);
  });

  it.each([
    ["ohne Stichwort", undefined],
    ["leeres Stichwort", " "],
  ])("zieht %s nur einen Pfad: eine Seite ohne Zeilen und ohne Schrift", (_name, keyword) => {
    const { pages } = createPaginator().paginate(written(keyword), 1);

    expect(pages).toHaveLength(1);
    expect(pages[0]?.lines).toEqual([]);
    expect(pages[0]?.route.every(({ kind }) => kind === "connector")).toBe(true);
  });

  it("legt den Eingang jeder Folgeseite genau gegenüber den Ausgang der vorigen", () => {
    const { pages } = createPaginator().paginate(LONG, 3);

    expect(pages.length).toBeGreaterThan(1);
    pages.slice(1).forEach((page, index) => {
      const previousExit = itemAt(pages, index).exit;
      expect(page.entrance).toEqual({ cell: { x: 0, y: previousExit.cell.y }, side: "left" });
    });
  });

  it("schließt die erste Seite an den Ausgang der vorigen Antwort an", () => {
    const exitBefore: Gate = { cell: { x: 33, y: 12 }, side: "right" };

    const { pages } = createPaginator().paginate(written("Hallo"), 1, exitBefore);

    expect(pages[0]?.entrance).toEqual({ cell: { x: 0, y: 12 }, side: "left" });
  });

  it("legt ohne vorige Antwort den Eingang links auf die Höhe der Schrift", () => {
    const { pages } = createPaginator().paginate(written("Hallo"), 1);

    expect(pages[0]?.entrance.side).toBe("left");
    expect(pages[0]?.entrance.cell.y).toBe(pages[0]?.exit.cell.y);
  });

  it("setzt das Wort je nach Startwert links, mittig oder rechts, auf allen Seiten gleich", () => {
    const wide = createPaginator({ ...SETTINGS, columns: 60 });
    const columns = new Set(
      [1, 2, 3, 4, 5, 6, 7, 8].map((seed) =>
        firstLetterColumn(itemAt(wide.paginate(written("Hallo"), seed).pages, 0)),
      ),
    );

    expect(columns.size).toBe(3);
  });

  it("liefert mit demselben Startwert dasselbe und mit einem anderen etwas anderes", () => {
    const first = createPaginator().paginate(written("Hallo"), 7);

    expect(createPaginator().paginate(written("Hallo"), 7)).toEqual(first);
    expect(createPaginator().paginate(written("Hallo"), 8).pages[0]?.route).not.toEqual(
      first.pages[0]?.route,
    );
  });

  it("legt den Haltepunkt zwei Wegstücke hinter das Ende der letzten Glyphe der letzten Seite", () => {
    const { pages, restingStepIndex } = createPaginator().paginate(LONG, 2);

    const lastPage = pages[pages.length - 1];
    expect(restingStepIndex).toBe((lastPage?.lastGlyphEnd ?? -99) + 2);
    expect(lastPage?.route[restingStepIndex]).toBeDefined();
  });

  it("richtet den Haltepunkt nach dem eingestellten Abstand", () => {
    const near = createPaginator({ ...SETTINGS, restingDistance: 1 }).paginate(written("Hallo"), 2);
    const far = createPaginator({ ...SETTINGS, restingDistance: 3 }).paginate(written("Hallo"), 2);

    expect(far.restingStepIndex - near.restingStepIndex).toBe(2);
  });

  it("nennt den Haltepunkt für jede beliebige Seite, auch eine mitten in der Antwort", () => {
    const paginator = createPaginator();
    const { pages, restingStepIndex } = paginator.paginate(LONG, 1);

    expect(pages.length).toBeGreaterThan(1);
    const firstPage = itemAt(pages, 0);
    expect(paginator.restingStepOf(firstPage)).toBe(firstPage.lastGlyphEnd + 2);
    expect(paginator.restingStepOf(itemAt(pages, pages.length - 1))).toBe(restingStepIndex);
  });

  it("liefert in Stücken dasselbe wie `paginate` und pausiert zweimal je Seite", () => {
    const steps = createPaginator().paginateInSteps(LONG, 3);

    let pauses = 0;
    let step = steps.next();
    while (step.done !== true) {
      pauses++;
      step = steps.next();
    }

    const expected = createPaginator().paginate(LONG, 3);
    expect(expected.pages.length).toBeGreaterThan(1);
    expect(pauses).toBe(2 * expected.pages.length);
    expect(step.value).toEqual(expected);
  });

  describe("mit einem Bild", () => {
    const HEART = { picture: "heart", keyword: "<3" } as const;

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

    it("schreibt das Stichwort, wenn das Bild selbst in einem feineren Raster nicht passt (zu schmal)", () => {
      const narrow = { ...SETTINGS, columns: 12, rows: 14 };

      const { pages } = createPaginator(narrow).paginate(
        { picture: "face_with_hand_over_mouth", keyword: "Ups" },
        1,
      );

      expect(pages.flatMap((page) => page.lines).join("")).toBe("UPS");
    });

    describe("das nicht auf die Bühne passt (ADR 0007)", () => {
      const STAGE = { ...SETTINGS, columns: 85, rows: 15 };
      const SMILEY = { picture: "face_with_hand_over_mouth", keyword: "Ups" } as const;

      it("zeichnet es in einem feineren Raster mit so vielen Reihen, wie es braucht", () => {
        const page = itemAt(createPaginator(STAGE).paginate(SMILEY, 1).pages, 0);

        // 22 Reihen statt 15, die Spalten im selben Verhältnis: 85 × 22 / 15 = 124,7
        expect([page.grid.columns, page.grid.rows]).toEqual([124, 22]);
        expect(page.cellScale).toBeCloseTo(15 / 22);
        expect(page.route.some(({ kind }) => kind === "letter")).toBe(true);
      });

      it("nimmt das feinere Raster aus den Einstellungen, wenn sie eins vorgeben (aus den Pixeln der Bühne)", () => {
        const fineGridOf = (rows: number) => ({ columns: 136, rows: rows + 2 });

        const page = itemAt(createPaginator({ ...STAGE, fineGridOf }).paginate(SMILEY, 1).pages, 0);

        expect([page.grid.columns, page.grid.rows]).toEqual([136, 24]);
        expect(page.cellScale).toBeCloseTo(15 / 24);
      });

      it("schreibt das Stichwort, wenn die Einstellungen kein feineres Raster hergeben", () => {
        const fineGridOf = () => undefined;

        const { pages } = createPaginator({ ...STAGE, fineGridOf }).paginate(SMILEY, 1);

        expect(pages.flatMap((page) => page.lines).join("")).toBe("UPS");
      });

      it("nennt seinen Ausgang auch im Raster der Bühne, für die nächste Antwort", () => {
        const page = itemAt(createPaginator(STAGE).paginate(SMILEY, 1).pages, 0);

        expect(page.handOver).toEqual(
          gateInGrid(page.exit, { columns: 124, rows: 22 }, { columns: 85, rows: 15 }),
        );
      });

      it("rechnet den Ausgang der vorigen Antwort in sein Raster um", () => {
        const exitBefore: Gate = { cell: { x: 84, y: 12 }, side: "right" };

        const { pages } = createPaginator(STAGE).paginate(SMILEY, 1, exitBefore);

        expect(pages[0]?.entrance).toEqual({ cell: { x: 0, y: 18 }, side: "left" });
      });

      it("lässt ein Bild, das passt, im Raster der Bühne", () => {
        const page = itemAt(createPaginator(STAGE).paginate(HEART, 1).pages, 0);

        expect([page.grid.columns, page.grid.rows]).toEqual([85, 15]);
        expect(page.cellScale).toBeUndefined();
        expect(page.handOver).toBeUndefined();
      });

      it("macht es mit dem Foto ebenso", () => {
        const low = { ...SETTINGS, columns: 85, rows: 9 };

        const page = itemAt(
          createPaginator(low).paginate({ photo: "chris", keyword: "Chris" }, 1).pages,
          0,
        );

        expect([page.grid.columns, page.grid.rows]).toEqual([94, 10]);
        expect(page.photo?.size).toBe(6);
      });
    });
  });

  describe("mit einem Foto", () => {
    const CHRIS = { photo: "chris", keyword: "Das ist Chris." } as const;

    it("legt das Foto auf eine einzige Seite ohne Zeilen; der Haltepunkt liegt hinter der letzten Runde", () => {
      const { pages, restingStepIndex } = createPaginator().paginate(CHRIS, 1);
      const page = itemAt(pages, 0);

      expect(pages).toHaveLength(1);
      expect(page.lines).toEqual([]);
      // so groß, wie es passt: 34 Spalten ohne je 3 Spalten Rand und den Rahmen
      expect(page.photo?.size).toBe(26);
      expect(page.photo?.lapEnds).toHaveLength(3);
      expect(restingStepIndex).toBe(page.lastGlyphEnd + 2);
    });

    it("legt das Foto je nach Startwert an eine andere Stelle", () => {
      const places = new Set(
        [1, 2, 3, 4, 5].map((seed) => {
          const wide = createPaginator({ ...SETTINGS, columns: 85, rows: 15 });
          const photo = wide.paginate(CHRIS, seed).pages[0]?.photo;
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

    it("schreibt das Stichwort, wenn das Foto nicht auf die Seite passt", () => {
      const narrow = { ...SETTINGS, columns: 12, rows: 60 };

      const { pages } = createPaginator(narrow).paginate(CHRIS, 1);

      // 12 Spalten fassen ein Zeichen je Zeile
      expect(pages.flatMap((page) => page.lines).join("")).toBe("DASISTCHRIS.");
      expect(pages[0]?.photo).toBeUndefined();
    });
  });
});
