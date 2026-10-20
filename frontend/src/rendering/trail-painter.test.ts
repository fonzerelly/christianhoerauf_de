import { describe, expect, it } from "vitest";
import { mazePage, routeOf } from "../test-support/maze-page-builder";
import { playbackView } from "../test-support/fake-playback-view";
import { recordingContext } from "../test-support/recording-context";
import { TEST_LAYOUT, TEST_SETTINGS } from "./test-settings";
import { TrailPainter } from "./trail-painter";

// Zellen zu 10 Pixeln, Rand (5, 5), Spurbreite 4: Jedes Wegstück wird um eine halbe Spurbreite
// (2 Pixel) gegen die Laufrichtung versetzt gezeichnet, damit die Stücke lückenlos aneinander passen.

const PAGE = mazePage({
  columns: 8,
  rows: 6,
  route: [
    { x: 0, y: 0, kind: "connector", isDot: false },
    { x: 1, y: 0, kind: "letter", isDot: false },
    { x: 1, y: 1, kind: "letter", isDot: false },
  ],
});

function draw(view = playbackView({ currentPage: PAGE, progress: 2 }), page = PAGE): string[] {
  const { context, calls } = recordingContext();
  new TrailPainter().draw(context, view, page, TEST_LAYOUT, TEST_SETTINGS);
  return calls;
}

/** Die Stellen der Aufzeichnung, an denen gezeichnet (`stroke()`) wird. */
function strokeIndices(calls: string[]): number[] {
  return calls.flatMap((call, index) => (call === "stroke()" ? [index] : []));
}

describe("TrailPainter", () => {
  it("zeichnet die gelaufenen Schriftwege als eine Linie je Helligkeitsstufe, mit Leuchten", () => {
    const calls = draw();

    expect(calls.slice(0, 5)).toEqual([
      "save()",
      "strokeStyle = #f00",
      "fillStyle = #f00",
      "lineWidth = 4",
      "lineCap = butt",
    ]);
    // Das Leuchten rechnet der Browser in Geräte-Pixeln: 4 * Pixeldichte 2
    expect(calls).toContain("shadowBlur = 8");
    expect(calls.filter((call) => call === "stroke()")).toHaveLength(1);
    const strokeAt = calls.indexOf("stroke()");
    expect(calls.slice(strokeAt - 6, strokeAt + 1)).toEqual([
      "globalAlpha = 1",
      "beginPath()",
      "moveTo(8, 10)",
      "lineTo(18, 10)",
      "moveTo(20, 8)",
      "lineTo(20, 18)",
      "stroke()",
    ]);
    expect(calls.at(-1)).toBe("restore()");
  });

  it("zeichnet jede Stufe der Helligkeit für sich, mit entsprechender Deckkraft", () => {
    const view = playbackView({
      currentPage: PAGE,
      progress: 2,
      levelOfStep: (step) => (step === 1 ? 8 : 16),
    });

    const calls = draw(view);

    const strokes = strokeIndices(calls);
    expect(strokes).toHaveLength(2);
    const firstStroke = strokes[0] ?? -1;
    expect(calls.slice(firstStroke - 4, firstStroke)).toEqual([
      "globalAlpha = 0.5",
      "beginPath()",
      "moveTo(8, 10)",
      "lineTo(18, 10)",
    ]);
  });

  it("zeichnet Verbindungswege blass, nach Deckkraft der Einstellung, und vor den Schriftwegen", () => {
    const page = mazePage({
      columns: 8,
      rows: 6,
      route: [
        { x: 0, y: 0, kind: "connector", isDot: false },
        { x: 1, y: 0, kind: "connector", isDot: false },
        { x: 2, y: 0, kind: "letter", isDot: false },
      ],
    });
    const calls = draw(playbackView({ currentPage: page, progress: 2 }), page);

    const strokes = strokeIndices(calls);
    expect(strokes).toHaveLength(2);
    const firstStroke = strokes[0] ?? -1;
    expect(calls.slice(firstStroke - 4, firstStroke)).toEqual([
      "globalAlpha = 0.25",
      "beginPath()",
      "moveTo(8, 10)",
      "lineTo(18, 10)",
    ]);
    // erst danach das Leuchten für die Schriftwege
    expect(calls.indexOf("shadowBlur = 8")).toBeGreaterThan(firstStroke);
  });

  it("zeichnet Sprünge ohne Leuchtspur gar nicht", () => {
    const page = mazePage({
      columns: 8,
      rows: 6,
      route: routeOf("silent", [0, 0], [1, 0], [1, 1]),
    });

    const calls = draw(playbackView({ currentPage: page, progress: 2 }), page);

    expect(calls).not.toContain("stroke()");
  });

  it("zeichnet das Wegstück, das der Lichtpunkt gerade läuft, nur bis zu seiner Stelle", () => {
    const view = playbackView({ currentPage: PAGE, progress: 1.5, dot: { x: 1, y: 0.5 } });

    const calls = draw(view);

    expect(calls).toContain("moveTo(20, 8)");
    expect(calls).toContain("lineTo(20, 13)");
    expect(calls).not.toContain("lineTo(20, 18)");
  });

  it("zeichnet ein noch nicht fertiges Wegstück ganz, wenn die Stelle des Lichtpunkts unbekannt ist", () => {
    const view = playbackView({ currentPage: PAGE, progress: 1.5 });

    expect(draw(view)).toContain("lineTo(20, 18)");
  });

  it("lässt Wegstücke aus, die schon verglommen sind", () => {
    const view = playbackView({ currentPage: PAGE, progress: 2, firstGlowingStep: 2 });

    const calls = draw(view);

    expect(calls).not.toContain("moveTo(8, 10)");
    expect(calls).toContain("moveTo(20, 8)");
  });

  it("lässt Wegstücke aus, die der Lichtpunkt noch nicht erreicht hat", () => {
    const view = playbackView({ currentPage: PAGE, progress: 1 });

    const calls = draw(view);

    expect(calls).toContain("moveTo(8, 10)");
    expect(calls).not.toContain("moveTo(20, 8)");
  });

  it("zeichnet Punkte (Umlaut, Satzpunkt) als Kreise, sobald der Lichtpunkt dort war", () => {
    const page = mazePage({
      columns: 8,
      rows: 6,
      route: [
        { x: 0, y: 0, kind: "connector", isDot: false },
        { x: 1, y: 0, kind: "silent", isDot: true },
        { x: 2, y: 0, kind: "silent", isDot: true },
      ],
    });

    const calls = draw(
      playbackView({ currentPage: page, progress: 1.5, dot: { x: 1.5, y: 0 } }),
      page,
    );

    // Zelle (1, 0) hat die Mitte (20, 10); der Radius ist 0,8 Spurbreiten. Zelle (2, 0) ist noch nicht erreicht.
    expect(calls).toContain("moveTo(20, 10)");
    expect(calls).toContain("arc(20, 10, 3.2, 0, 6.283185307179586)");
    expect(calls).not.toContain("arc(30, 10, 3.2, 0, 6.283185307179586)");
    expect(calls).toContain("fill()");
  });
});
