import { describe, expect, it } from "vitest";
import { mazePage, routeOf } from "./maze-page-builder";

describe("mazePage", () => {
  it("baut eine Seite mit dem verlangten Raster, ohne Durchgänge", () => {
    const page = mazePage({ columns: 3, rows: 2 });

    expect(page.grid.columns).toBe(3);
    expect(page.grid.rows).toBe(2);
    expect(page.grid.isOpenRight(0, 0)).toBe(false);
    expect(page.grid.isOpenDown(0, 0)).toBe(false);
  });

  it("öffnet die genannten Durchgänge zwischen Nachbarzellen", () => {
    const page = mazePage({
      columns: 2,
      rows: 2,
      passages: [
        [
          { x: 0, y: 0 },
          { x: 1, y: 0 },
        ],
        [
          { x: 1, y: 0 },
          { x: 1, y: 1 },
        ],
      ],
    });

    expect(page.grid.isOpenRight(0, 0)).toBe(true);
    expect(page.grid.isOpenDown(1, 0)).toBe(true);
    expect(page.grid.isOpenDown(0, 0)).toBe(false);
  });

  it("nimmt Eingang, Ausgang, Route und Ende der letzten Glyphe, wie sie genannt werden", () => {
    const entrance = { cell: { x: 0, y: 0 }, side: "left" } as const;
    const exit = { cell: { x: 1, y: 1 }, side: "right" } as const;
    const route = routeOf("letter", [0, 0], [1, 0]);

    const page = mazePage({ entrance, exit, route, lastGlyphEnd: 1 });

    expect(page).toMatchObject({ entrance, exit, route, lastGlyphEnd: 1 });
  });

  it("hat ohne Angaben einen Eingang links oben, einen Ausgang rechts unten und eine leere Route", () => {
    const page = mazePage({ columns: 4, rows: 3 });

    expect(page.entrance).toEqual({ cell: { x: 0, y: 0 }, side: "left" });
    expect(page.exit).toEqual({ cell: { x: 3, y: 2 }, side: "right" });
    expect(page.route).toEqual([]);
    expect(page.lines).toEqual([]);
    expect(page.lastGlyphEnd).toBe(0);
  });
});

describe("routeOf", () => {
  it("macht aus Zellen Wegstücke einer Art, ohne Punkte", () => {
    expect(routeOf("connector", [1, 2], [3, 4])).toEqual([
      { x: 1, y: 2, kind: "connector", isDot: false },
      { x: 3, y: 4, kind: "connector", isDot: false },
    ]);
  });
});
