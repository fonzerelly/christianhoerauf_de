import { describe, expect, it } from "vitest";
import { playbackView } from "../test-support/fake-playback-view";
import { FakeLayers } from "../test-support/fake-layers";
import { mazePage, routeOf } from "../test-support/maze-page-builder";
import { recordingContext } from "../test-support/recording-context";
import { scriptedRandom } from "../test-support/scripted-random";
import { CanvasRenderer } from "./canvas-renderer";
import type { CanvasSurface } from "./drawing-context";
import { TEST_LAYOUT, TEST_SETTINGS } from "./test-settings";

const PAGE = mazePage({
  columns: 8,
  rows: 6,
  route: routeOf("letter", [0, 0], [1, 0], [2, 0]),
  exit: { cell: { x: 7, y: 3 }, side: "right" },
});
const NEXT_PAGE = mazePage({ columns: 8, rows: 6 });

function setup(
  options: { isReduced?: boolean; random?: number[]; glitchesPerMinute?: number } = {},
) {
  const { context, calls } = recordingContext();
  const layers = new FakeLayers();
  const surface = {
    width: 0,
    height: 0,
    style: { width: "", height: "" },
    name: "Leinwand",
  } satisfies CanvasSurface & { name: string };
  const renderer = new CanvasRenderer({
    canvas: surface as unknown as CanvasSurface & CanvasImageSource,
    context,
    createLayer: layers.create,
    random: scriptedRandom(...(options.random ?? [])),
    motion: { isReduced: options.isReduced ?? false },
    settings: { ...TEST_SETTINGS, glitchesPerMinute: options.glitchesPerMinute ?? 0 },
    layout: TEST_LAYOUT,
  });
  return { renderer, calls, layers, surface };
}

describe("CanvasRenderer", () => {
  describe("Größe", () => {
    it("stellt die Zeichenfläche auf die Bühne ein: Anzeigegröße in Pixeln, Auflösung in Geräte-Pixeln", () => {
      const { surface } = setup();

      expect(surface.style).toEqual({ width: "100px", height: "80px" });
      expect(surface.width).toBe(200);
      expect(surface.height).toBe(160);
    });

    it("passt die Zeichenfläche an, wenn die Bühne eine andere Größe bekommt, und zeichnet alles neu vor", () => {
      const { renderer, surface, layers } = setup();
      const view = playbackView({ currentPage: PAGE });
      renderer.draw(view, 0);
      expect(layers.created).toHaveLength(2);

      renderer.resize({ ...TEST_LAYOUT, viewWidth: 120, viewHeight: 90, pixelRatio: 1 });

      expect(surface.style).toEqual({ width: "120px", height: "90px" });
      expect(surface.width).toBe(120);
      expect(surface.height).toBe(90);
      renderer.draw(view, 0);
      expect(layers.created).toHaveLength(4);
    });
  });

  describe("draw", () => {
    it("stellt den Maßstab vor jedem Bild neu ein und füllt den Hintergrund", () => {
      const { renderer, calls } = setup();

      renderer.draw(playbackView({}), 0);

      expect(calls.slice(0, 3)).toEqual([
        "setTransform(2, 0, 0, 2, 0, 0)",
        "fillStyle = #000",
        "fillRect(0, 0, 100, 80)",
      ]);
    });

    it("legt zum Schluss die Glasscheibe über das Bild, auch wenn es noch keine Seite gibt", () => {
      const { renderer, calls } = setup();

      renderer.draw(playbackView({}), 0);

      expect(calls.at(-1)).toBe("drawImage(<Fläche 1>, 0, 0, 100, 80)");
    });

    it("zeichnet die Seite mit ihren Wänden, darüber Leuchtspur und Lichtpunkt, beschnitten auf das Labyrinth", () => {
      const { renderer, calls } = setup();
      const view = playbackView({
        currentPage: PAGE,
        progress: 1,
        isDotVisible: true,
        dot: { x: 1, y: 0 },
      });

      renderer.draw(view, 0);

      const wallAt = calls.indexOf("drawImage(<Fläche 1>, -3, -3, 96, 76)");
      const clipAt = calls.indexOf("clip()");
      const trailAt = calls.indexOf("lineCap = butt");
      const dotAt = calls.findIndex((call) => call.startsWith("arc(20, 10, 3,"));
      const overlayAt = calls.indexOf("drawImage(<Fläche 2>, 0, 0, 100, 80)");
      expect(wallAt).toBeGreaterThan(2);
      expect(calls[wallAt - 2]).toBe("save()");
      expect(calls[wallAt - 1]).toBe("translate(0, 0)");
      expect(clipAt).toBeGreaterThan(wallAt);
      expect(calls.slice(clipAt - 3, clipAt)).toEqual([
        "save()",
        "beginPath()",
        "rect(5, 5, 80, 60)",
      ]);
      expect(trailAt).toBeGreaterThan(clipAt);
      expect(dotAt).toBeGreaterThan(trailAt);
      expect(overlayAt).toBeGreaterThan(dotAt);
    });

    it("zeichnet beim Weiterschieben beide Seiten verschoben, die neue nur mit ihren Wänden", () => {
      const { renderer, calls } = setup();
      const view = playbackView({
        currentPage: PAGE,
        nextPage: NEXT_PAGE,
        isScrolling: true,
        scrollPart: 0.5,
        isAnimating: true,
        progress: 2,
      });

      renderer.draw(view, 0);

      // Ausgang rechts: Die alte Seite weicht um eine halbe Rasterbreite (40 Pixel) nach links, die neue rückt von rechts herein.
      expect(calls).toContain("translate(-40, 0)");
      expect(calls).toContain("translate(40, 0)");
      const incomingAt = calls.indexOf("translate(40, 0)");
      expect(calls.slice(incomingAt, incomingAt + 2)).toEqual([
        "translate(40, 0)",
        "drawImage(<Fläche 2>, -3, -3, 96, 76)",
      ]);
      expect(calls.filter((call) => call === "clip()")).toHaveLength(1);
    });

    it("zeichnet die Wände der nächsten Seite schon vorab, damit das Weiterschieben nicht ruckelt", () => {
      const { renderer, layers } = setup();
      const view = playbackView({ currentPage: PAGE, nextPage: NEXT_PAGE });

      renderer.draw(view, 0);
      renderer.draw(view, 0);

      // eine Fläche für die aktuelle Seite, eine für die nächste, eine für die Glasscheibe
      expect(layers.created).toHaveLength(3);
    });

    it("wirft die Wandbilder von Seiten weg, die nicht mehr gebraucht werden", () => {
      const { renderer, layers } = setup();
      renderer.draw(playbackView({ currentPage: PAGE, nextPage: NEXT_PAGE }), 0);
      renderer.draw(playbackView({ currentPage: NEXT_PAGE }), 0);
      expect(layers.created).toHaveLength(3);

      renderer.draw(playbackView({ currentPage: PAGE }), 0);

      expect(layers.created).toHaveLength(4);
    });

    it("lässt die Wände der Seite beim Weiterschieben unverschoben, solange nicht weitergeschoben wird", () => {
      const { renderer, calls } = setup();

      renderer.draw(playbackView({ currentPage: PAGE, nextPage: NEXT_PAGE }), 0);

      expect(calls).toContain("translate(0, 0)");
      expect(calls).not.toContain("translate(80, 0)");
    });
  });

  describe("Monitor", () => {
    it("lässt das Bild flimmern, solange die Animation läuft", () => {
      const { renderer, calls } = setup({ random: [0, 0.5] });

      renderer.draw(playbackView({ isAnimating: true }), 0);

      expect(calls).toContain("fillStyle = rgba(0, 0, 0, 0.025)");
    });

    it("lässt das Bild nicht flimmern, wenn die Animation steht", () => {
      const { renderer, calls } = setup({ random: [0, 0.5] });

      renderer.draw(playbackView({ isAnimating: false }), 0);

      expect(calls.some((call) => call.startsWith("fillStyle = rgba(0, 0, 0, 0.025"))).toBe(false);
    });

    it("zeichnet eine Bildstörung, die der Zufall auslöst, solange die Animation läuft", () => {
      // 600 Störungen pro Minute, 0,1 s je Bild: Wahrscheinlichkeit 1 je Bild
      const { renderer, calls } = setup({
        glitchesPerMinute: 600,
        random: [0.2, 0, 0.5, 0, 0, 0, 0, 0],
      });
      const view = playbackView({ isAnimating: true });

      renderer.draw(view, 0.1);
      expect(renderer.isGlitching).toBe(true);
      expect(calls.some((call) => call.startsWith("drawImage(<Leinwand>"))).toBe(false);
      renderer.draw(view, 0.2);

      expect(calls.some((call) => call.startsWith("drawImage(<Leinwand>"))).toBe(true);
    });

    it("meldet, dass keine Störung läuft, wenn keine beginnt", () => {
      const { renderer } = setup();

      renderer.draw(playbackView({ isAnimating: true }), 0.1);

      expect(renderer.isGlitching).toBe(false);
    });

    it("zeigt bei gewünschter Ruhe weder Flimmern noch Bildstörung und beendet eine laufende Störung", () => {
      const motion = { isReduced: false };
      const { context, calls } = recordingContext();
      const layers = new FakeLayers();
      const renderer = new CanvasRenderer({
        canvas: {
          width: 0,
          height: 0,
          style: { width: "", height: "" },
        } as unknown as CanvasSurface & CanvasImageSource,
        context,
        createLayer: layers.create,
        random: scriptedRandom(0.2, 0, 0.5, 0, 0),
        motion,
        settings: { ...TEST_SETTINGS, glitchesPerMinute: 600 },
        layout: TEST_LAYOUT,
      });
      const view = playbackView({ isAnimating: true });
      renderer.draw(view, 0.1);
      expect(renderer.isGlitching).toBe(true);
      calls.length = 0;

      motion.isReduced = true;
      renderer.draw(view, 0.1);

      expect(renderer.isGlitching).toBe(false);
      expect(calls.some((call) => call.startsWith("fillStyle = rgba(0, 0, 0, 0."))).toBe(false);
      expect(calls.filter((call) => call.startsWith("drawImage"))).toEqual([
        "drawImage(<Fläche 1>, 0, 0, 100, 80)",
      ]);
    });
  });

  describe("discardPreparedImages", () => {
    it("zeichnet Wände und Glasscheibe beim nächsten Bild neu", () => {
      const { renderer, layers } = setup();
      const view = playbackView({ currentPage: PAGE });
      renderer.draw(view, 0);

      renderer.discardPreparedImages();
      renderer.draw(view, 0);

      expect(layers.created).toHaveLength(4);
    });
  });
});
