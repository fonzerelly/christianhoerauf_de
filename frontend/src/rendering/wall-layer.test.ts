import { describe, expect, it } from "vitest";
import { FakeLayers } from "../test-support/fake-layers";
import { mazePage } from "../test-support/maze-page-builder";
import { recordingContext } from "../test-support/recording-context";
import type { RenderSettings } from "./render-settings";
import type { StageLayout } from "./stage-layout";
import { traceWalls, WallLayer } from "./wall-layer";

const SETTINGS: RenderSettings = {
  backgroundColor: "#000",
  wallColor: "#0f0",
  trailColor: "#f00",
  dotColor: "#f00",
  wallWidth: 2,
  bloomRadius: 3,
  bloomStrength: 0.5,
  trailWidth: 3,
  glow: 4,
  connectorOpacity: 0.25,
  scanlineStrength: 0.3,
  vignetteStrength: 0.5,
  flickerStrength: 0.2,
  glitchesPerMinute: 6,
  glitchStrength: 8,
};

const LAYOUT: StageLayout = {
  viewWidth: 100,
  viewHeight: 80,
  pixelRatio: 2,
  cellSize: 10,
  columns: 2,
  rows: 2,
  offsetX: 7,
  offsetY: 5,
};

/** 2 x 2 Zellen; offen sind (0,0)-(1,0) und (0,0)-(0,1); Eingang links an (0,0), Ausgang rechts an (1,1). */
function page() {
  return mazePage({
    columns: 2,
    rows: 2,
    passages: [
      [
        { x: 0, y: 0 },
        { x: 1, y: 0 },
      ],
      [
        { x: 0, y: 0 },
        { x: 0, y: 1 },
      ],
    ],
    entrance: { cell: { x: 0, y: 0 }, side: "left" },
    exit: { cell: { x: 1, y: 1 }, side: "right" },
  });
}

describe("traceWalls", () => {
  it("zeichnet jede geschlossene Wand als Linie, zellweise von oben links nach unten rechts", () => {
    const { context, calls } = recordingContext();

    traceWalls(context, page(), 10);

    expect(calls).toEqual([
      "beginPath()",
      // Zelle (0,0): offen nach rechts und unten, links der Eingang, oben eine Wand
      "moveTo(0, 0)",
      "lineTo(10, 0)",
      // Zelle (1,0): rechter Rand, Wand unten, oben
      "moveTo(20, 0)",
      "lineTo(20, 10)",
      "moveTo(10, 10)",
      "lineTo(20, 10)",
      "moveTo(10, 0)",
      "lineTo(20, 0)",
      // Zelle (0,1): Wand rechts, unterer Rand, linker Rand
      "moveTo(10, 10)",
      "lineTo(10, 20)",
      "moveTo(0, 20)",
      "lineTo(10, 20)",
      "moveTo(0, 10)",
      "lineTo(0, 20)",
      // Zelle (1,1): rechts der Ausgang, unterer Rand
      "moveTo(10, 20)",
      "lineTo(20, 20)",
    ]);
  });
});

describe("WallLayer", () => {
  it("zeichnet die Wände in drei Schichten auf eine eigene Fläche: Lichthof, Linie, heller Kern", () => {
    const layers = new FakeLayers();

    new WallLayer(layers.create).imageOf(page(), LAYOUT, SETTINGS);

    // Rand um das Labyrinth: Wandstärke + 2 mal Lichthof = 8; (2 * 10 + 2 * 8) * Pixeldichte 2 = 72
    expect(layers.created).toHaveLength(1);
    expect(layers.created[0]?.width).toBe(72);
    expect(layers.created[0]?.height).toBe(72);
    const calls = layers.created[0]?.calls ?? [];
    expect(calls.slice(0, 3)).toEqual(["scale(2, 2)", "translate(8, 8)", "lineCap = square"]);
    const afterWalls = calls.slice(calls.indexOf("lineTo(20, 20)") + 1);
    expect(afterWalls).toEqual([
      "save()",
      "strokeStyle = #0f0",
      "lineWidth = 2",
      "shadowColor = #0f0",
      "shadowBlur = 6",
      "globalAlpha = 0.5",
      "stroke()",
      "stroke()",
      "restore()",
      "strokeStyle = #0f0",
      "lineWidth = 2",
      "stroke()",
      "strokeStyle = #ffffff",
      "globalAlpha = 0.55",
      "lineWidth = 0.6666666666666666",
      "stroke()",
    ]);
  });

  it("hebt das Wandbild einer Seite auf und zeichnet es nicht noch einmal", () => {
    const layers = new FakeLayers();
    const walls = new WallLayer(layers.create);
    const aPage = page();

    const first = walls.imageOf(aPage, LAYOUT, SETTINGS);
    const second = walls.imageOf(aPage, LAYOUT, SETTINGS);

    expect(second).toBe(first);
    expect(layers.created).toHaveLength(1);
  });

  it("zeichnet das Wandbild neu, wenn sich das Aussehen der Wände ändert", () => {
    const layers = new FakeLayers();
    const walls = new WallLayer(layers.create);
    const aPage = page();
    walls.imageOf(aPage, LAYOUT, SETTINGS);

    walls.imageOf(aPage, LAYOUT, { ...SETTINGS, wallColor: "#00f" });
    expect(layers.created).toHaveLength(2);
    walls.imageOf(aPage, { ...LAYOUT, cellSize: 12 }, SETTINGS);
    expect(layers.created).toHaveLength(3);
    walls.imageOf(aPage, { ...LAYOUT, pixelRatio: 3 }, SETTINGS);
    expect(layers.created).toHaveLength(4);
  });

  it("zeichnet das Wandbild nicht neu, wenn sich nur etwas ändert, das die Wände nicht betrifft", () => {
    const layers = new FakeLayers();
    const walls = new WallLayer(layers.create);
    const aPage = page();
    walls.imageOf(aPage, LAYOUT, SETTINGS);

    walls.imageOf(aPage, { ...LAYOUT, offsetX: 99 }, { ...SETTINGS, glow: 9 });

    expect(layers.created).toHaveLength(1);
  });

  it("kopiert das Wandbild so aufs Bild, dass das Labyrinth am Rand der Bühne beginnt, samt Lichthof", () => {
    const layers = new FakeLayers();
    const { context, calls } = recordingContext();

    new WallLayer(layers.create).draw(context, page(), LAYOUT, SETTINGS);

    // Das Bild ist um den Rand 8 größer: Es beginnt bei offsetX - 8 und ist (20 + 16) mal (20 + 16) Pixel groß.
    expect(calls).toEqual(["drawImage(<Fläche 1>, -1, -3, 36, 36)"]);
  });

  it("behält nur die Wandbilder der genannten Seiten", () => {
    const layers = new FakeLayers();
    const walls = new WallLayer(layers.create);
    const [a, b, c] = [page(), page(), page()];
    walls.imageOf(a, LAYOUT, SETTINGS);
    walls.imageOf(b, LAYOUT, SETTINGS);
    walls.imageOf(c, LAYOUT, SETTINGS);

    walls.keepOnly([b, c]);
    walls.imageOf(b, LAYOUT, SETTINGS);
    walls.imageOf(c, LAYOUT, SETTINGS);
    expect(layers.created).toHaveLength(3);
    walls.imageOf(a, LAYOUT, SETTINGS);
    expect(layers.created).toHaveLength(4);
  });

  it("wirft alle Wandbilder weg, wenn man es verlangt", () => {
    const layers = new FakeLayers();
    const walls = new WallLayer(layers.create);
    const aPage = page();
    walls.imageOf(aPage, LAYOUT, SETTINGS);

    walls.clear();
    walls.imageOf(aPage, LAYOUT, SETTINGS);

    expect(layers.created).toHaveLength(2);
  });

  describe("prepare (vorab zeichnen, in Stücken)", () => {
    /** Führt `prepare` bis zum Ende aus und zählt die Pausen. */
    function prepareAndCountPauses(
      walls: WallLayer,
      aPage = page(),
      layout = LAYOUT,
      settings = SETTINGS,
    ): number {
      const steps = walls.prepare(aPage, layout, settings);
      let pauses = 0;
      while (steps.next().done !== true) pauses++;
      return pauses;
    }

    it("zeichnet dasselbe wie `imageOf`, aber mit einem `flush()` nach jedem Stück", () => {
      const layers = new FakeLayers();
      const walls = new WallLayer(layers.create);

      const pauses = prepareAndCountPauses(walls);

      expect(pauses).toBe(2);
      const calls = layers.created[0]?.calls ?? [];
      const afterWalls = calls.slice(calls.indexOf("lineTo(20, 20)") + 1);
      expect(afterWalls).toEqual([
        "save()",
        "strokeStyle = #0f0",
        "lineWidth = 2",
        "shadowColor = #0f0",
        "shadowBlur = 6",
        "globalAlpha = 0.5",
        "stroke()",
        "flush()", // Lichthof, erster Strich
        "stroke()",
        "restore()",
        "flush()", // Lichthof, zweiter Strich
        "strokeStyle = #0f0",
        "lineWidth = 2",
        "stroke()",
        "strokeStyle = #ffffff",
        "globalAlpha = 0.55",
        "lineWidth = 0.6666666666666666",
        "stroke()",
        "flush()", // Linie und Kern
      ]);
    });

    it("legt die Fläche erst im ersten Stück an, nicht schon beim Aufruf", () => {
      const layers = new FakeLayers();
      const steps = new WallLayer(layers.create).prepare(page(), LAYOUT, SETTINGS);

      expect(layers.created).toHaveLength(0);
      steps.next();
      expect(layers.created).toHaveLength(1);
    });

    it("hebt das Ergebnis auf: `imageOf` und `draw` brauchen danach nichts mehr zu zeichnen", () => {
      const layers = new FakeLayers();
      const walls = new WallLayer(layers.create);
      const aPage = page();

      prepareAndCountPauses(walls, aPage);
      expect(layers.created).toHaveLength(1);
      walls.imageOf(aPage, LAYOUT, SETTINGS);
      walls.draw(recordingContext().context, aPage, LAYOUT, SETTINGS);

      expect(layers.created).toHaveLength(1);
    });

    it("tut nichts, wenn das Wandbild schon da ist", () => {
      const layers = new FakeLayers();
      const walls = new WallLayer(layers.create);
      const aPage = page();
      walls.imageOf(aPage, LAYOUT, SETTINGS);

      const pauses = prepareAndCountPauses(walls, aPage);

      expect(pauses).toBe(0);
      expect(layers.created).toHaveLength(1);
    });

    it("zeichnet neu, wenn das vorhandene Wandbild veraltet ist", () => {
      const layers = new FakeLayers();
      const walls = new WallLayer(layers.create);
      const aPage = page();
      walls.imageOf(aPage, LAYOUT, SETTINGS);

      prepareAndCountPauses(walls, aPage, LAYOUT, { ...SETTINGS, wallColor: "#00f" });

      expect(layers.created).toHaveLength(2);
    });
  });
});
