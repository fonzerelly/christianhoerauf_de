import { describe, expect, it } from "vitest";
import { createDefaultFont } from "../../src/domain/font/font";
import { Mulberry32 } from "../../src/domain/random/mulberry32";
import { MazePageGenerator } from "../../src/domain/pages/maze-page-generator";
import type { MazePage } from "../../src/domain/pages/maze-page-generator";
import type { Gate } from "../../src/domain/route/gate";
import { readGlyphs } from "./route-reader";

const COLUMNS = 34;
const ROWS = 60;
const SETTINGS = {
  windiness: 0.7,
  detour: 0.3,
  returnBandRows: 2,
  returnWindiness: 0.5,
  maxWallRun: 4,
};
const ENTRANCE: Gate = { cell: { x: 0, y: 30 }, side: "left" };

function generate(lines: string[], seed = 1): MazePage {
  const generator = new MazePageGenerator(
    COLUMNS,
    ROWS,
    new Mulberry32(seed),
    createDefaultFont(),
    SETTINGS,
  );
  return generator.generate(lines, ENTRANCE);
}

describe("readGlyphs", () => {
  it("erkennt jede Glyphe der Zeile an dem, was die Route dort schreibt", () => {
    const read = readGlyphs(generate(["HALLO"]), SETTINGS.returnBandRows);

    // O und 0 haben denselben Weg, der Leser nennt beide
    expect(read).toEqual([["H", "A", "L", "L", "0O"]]);
  });

  it("erkennt Leerzeichen als Felder ohne Schrift", () => {
    const read = readGlyphs(generate(["A B"]), SETTINGS.returnBandRows);

    expect(read[0]).toEqual(["A", " ", "B"]);
  });

  it("liest mehrere Zeilen", () => {
    const read = readGlyphs(generate(["AB", "CD"]), SETTINGS.returnBandRows);

    expect(read).toEqual([
      ["A", "B"],
      ["C", "D"],
    ]);
  });

  it("nennt alle Zeichen mit demselben Weg, etwa 0 und O", () => {
    const read = readGlyphs(generate(["O"]), SETTINGS.returnBandRows);

    expect(read[0]?.[0]).toBe("0O");
  });

  it("erkennt Umlaute, Punkt, Fragezeichen, Ausrufezeichen und die Ersatzglyphe", () => {
    const read = readGlyphs(generate(["Ä.?!█"]), SETTINGS.returnBandRows);

    expect(read[0]).toEqual(["Ä", ".", "?", "!", "█"]);
  });

  it("liefert für ein Feld, dessen Weg zu keiner Glyphe passt, einen leeren Eintrag", () => {
    const page = generate(["L"]);
    // Ein Schriftweg des L wird zu einem Sprung ohne Leuchtspur: Es bleibt eine unlesbare Schrift.
    const tampered: MazePage = {
      ...page,
      route: page.route.map((step, index) =>
        index === page.lastGlyphEnd ? { ...step, kind: "silent" } : step,
      ),
    };

    expect(readGlyphs(tampered, SETTINGS.returnBandRows)).toEqual([[""]]);
  });

  it("meldet Schrift außerhalb jedes Glyphen-Felds als Fehler", () => {
    const page = generate(["L"]);
    const stray = { x: 1, y: 1, kind: "letter" as const, isDot: false };
    const withStray: MazePage = {
      ...page,
      route: [...page.route.slice(0, 3), stray, ...page.route.slice(3)],
    };

    expect(() => readGlyphs(withStray, SETTINGS.returnBandRows)).toThrow("außerhalb");
  });
});
