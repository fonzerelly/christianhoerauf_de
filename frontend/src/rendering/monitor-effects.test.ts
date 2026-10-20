import { describe, expect, it } from "vitest";
import { FakeLayers } from "../test-support/fake-layers";
import { recordingContext } from "../test-support/recording-context";
import { scriptedRandom } from "../test-support/scripted-random";
import { MonitorEffects } from "./monitor-effects";
import { TEST_LAYOUT, TEST_SETTINGS } from "./test-settings";

const CANVAS = { name: "Bild" } as unknown as CanvasImageSource;

describe("MonitorEffects", () => {
  describe("drawOverlay (Zeilenraster und dunkle Ecken)", () => {
    it("zeichnet jede dritte Bildzeile dunkel und darüber einen Farbverlauf zu dunklen Ecken", () => {
      const layers = new FakeLayers();

      new MonitorEffects(layers.create, scriptedRandom()).drawOverlay(
        recordingContext().context,
        TEST_LAYOUT,
        TEST_SETTINGS,
      );

      expect(layers.created).toHaveLength(1);
      expect(layers.created[0]?.width).toBe(200);
      expect(layers.created[0]?.height).toBe(160);
      const calls = layers.created[0]?.calls ?? [];
      expect(calls.slice(0, 4)).toEqual([
        "scale(2, 2)",
        "fillStyle = rgba(0, 0, 0, 0.3)",
        "fillRect(0, 0, 100, 1)",
        "fillRect(0, 3, 100, 1)",
      ]);
      expect(
        calls.filter((call) => call.startsWith("fillRect(0, ") && call.endsWith(", 100, 1)")),
      ).toHaveLength(27);
      expect(calls.slice(-5)).toEqual([
        "createRadialGradient(50, 40, 28, 50, 40, 64.03124237432849)",
        "gradient.addColorStop(0, rgba(0, 0, 0, 0))",
        "gradient.addColorStop(1, rgba(0, 0, 0, 0.5))",
        "fillStyle = <gradient>",
        "fillRect(0, 0, 100, 80)",
      ]);
    });

    it("legt das vorab gezeichnete Bild über das ganze Bild", () => {
      const layers = new FakeLayers();
      const { context, calls } = recordingContext();

      new MonitorEffects(layers.create, scriptedRandom()).drawOverlay(
        context,
        TEST_LAYOUT,
        TEST_SETTINGS,
      );

      expect(calls).toEqual(["drawImage(<Fläche 1>, 0, 0, 100, 80)"]);
    });

    it("zeichnet es nur einmal vor, solange sich nichts daran ändert", () => {
      const layers = new FakeLayers();
      const effects = new MonitorEffects(layers.create, scriptedRandom());
      const { context } = recordingContext();

      effects.drawOverlay(context, TEST_LAYOUT, TEST_SETTINGS);
      effects.drawOverlay(context, TEST_LAYOUT, { ...TEST_SETTINGS, glow: 9 });

      expect(layers.created).toHaveLength(1);
    });

    it("zeichnet es neu, wenn sich Größe, Zeilenraster oder dunkle Ecken ändern", () => {
      const layers = new FakeLayers();
      const effects = new MonitorEffects(layers.create, scriptedRandom());
      const { context } = recordingContext();
      effects.drawOverlay(context, TEST_LAYOUT, TEST_SETTINGS);

      effects.drawOverlay(context, { ...TEST_LAYOUT, viewWidth: 120 }, TEST_SETTINGS);
      expect(layers.created).toHaveLength(2);
      effects.drawOverlay(
        context,
        { ...TEST_LAYOUT, viewWidth: 120 },
        { ...TEST_SETTINGS, scanlineStrength: 0.6 },
      );
      expect(layers.created).toHaveLength(3);
      effects.drawOverlay(
        context,
        { ...TEST_LAYOUT, viewWidth: 120 },
        { ...TEST_SETTINGS, scanlineStrength: 0.6, vignetteStrength: 0.9 },
      );
      expect(layers.created).toHaveLength(4);
    });

    it("zeichnet es neu, nachdem man die vorab gezeichneten Bilder verworfen hat", () => {
      const layers = new FakeLayers();
      const effects = new MonitorEffects(layers.create, scriptedRandom());
      const { context } = recordingContext();
      effects.drawOverlay(context, TEST_LAYOUT, TEST_SETTINGS);

      effects.discardPreparedImages();
      effects.drawOverlay(context, TEST_LAYOUT, TEST_SETTINGS);

      expect(layers.created).toHaveLength(2);
    });
  });

  describe("drawFlicker", () => {
    it("dunkelt das Bild um einen kleinen Zufallswert ab", () => {
      const { context, calls } = recordingContext();

      new MonitorEffects(new FakeLayers().create, scriptedRandom(0.5)).drawFlicker(
        context,
        TEST_LAYOUT,
        TEST_SETTINGS,
      );

      expect(calls).toEqual(["fillStyle = rgba(0, 0, 0, 0.025)", "fillRect(0, 0, 100, 80)"]);
    });
  });

  describe("drawGlitch", () => {
    it("zeichnet vorerst nichts, solange der Störbalken noch nicht im Bild ist", () => {
      const { context, calls } = recordingContext();

      new MonitorEffects(new FakeLayers().create, scriptedRandom()).drawGlitch(
        context,
        CANVAS,
        { part: 0, bandHeight: 8 },
        TEST_LAYOUT,
        TEST_SETTINGS,
      );

      expect(calls.filter((call) => call.startsWith("drawImage"))).toEqual([]);
    });

    it("verschiebt im Störbalken schmale Streifen des fertigen Bildes seitlich", () => {
      const { context, calls } = recordingContext();
      // Streifen 1: Höhe 2 + floor(0 * 6) = 2, Versatz (0,75 - 0,5) * 2 * 8 = 4
      // Streifen 2: Höhe 2 + floor(0,5 * 6) = 5, Versatz (0 - 0,5) * 2 * 8 = -8
      const random = scriptedRandom(0, 0.75, 0.5, 0);

      new MonitorEffects(new FakeLayers().create, random).drawGlitch(
        context,
        CANVAS,
        { part: 0.5, bandHeight: 8 },
        TEST_LAYOUT,
        TEST_SETTINGS,
      );

      // Balken von 36 bis 44; Pixeldichte 2, das Bild ist 200 Geräte-Pixel breit
      const strips = calls.filter((call) => call.startsWith("drawImage"));
      expect(strips.slice(0, 2)).toEqual([
        "drawImage(<Bild>, 0, 72, 200, 4, 4, 36, 100, 2)",
        "drawImage(<Bild>, 0, 76, 200, 10, -8, 38, 100, 5)",
      ]);
    });

    it("legt über den Balken einen hellen Schleier und ein paar Rausch-Striche", () => {
      const { context, calls } = recordingContext();

      new MonitorEffects(new FakeLayers().create, scriptedRandom()).drawGlitch(
        context,
        CANVAS,
        { part: 0.5, bandHeight: 8 },
        TEST_LAYOUT,
        TEST_SETTINGS,
      );

      const veil = calls.indexOf("globalCompositeOperation = lighter");
      expect(calls.slice(veil - 1, veil + 6)).toEqual([
        "save()",
        "globalCompositeOperation = lighter",
        "fillStyle = #0f0",
        "globalAlpha = 0.07",
        "fillRect(0, 36, 100, 8)",
        "globalAlpha = 0.5",
        "fillRect(0, 36, 10, 1)",
      ]);
      expect(
        calls.filter((call) => call.endsWith(", 1)") && call.startsWith("fillRect(0, 36, 10")),
      ).toHaveLength(12);
      expect(calls.at(-1)).toBe("restore()");
    });
  });
});
