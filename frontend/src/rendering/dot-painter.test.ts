import { describe, expect, it } from "vitest";
import { playbackView } from "../test-support/fake-playback-view";
import { recordingContext } from "../test-support/recording-context";
import { DotPainter } from "./dot-painter";
import { TEST_LAYOUT, TEST_SETTINGS } from "./test-settings";

// Zellen zu 10 Pixeln, Rand (5, 5), Pixeldichte 2: Der Lichtpunkt in Zelle (1, 2) hat seine Mitte
// bei (20, 30). Sein Radius ist 0,3 Zellen, also 3 Pixel; das Leuchten ist eine Zelle breit.

function draw(view: Parameters<typeof playbackView>[0], isReduced = false): string[] {
  const { context, calls } = recordingContext();
  new DotPainter().draw(context, playbackView(view), TEST_LAYOUT, TEST_SETTINGS, { isReduced });
  return calls;
}

describe("DotPainter", () => {
  it("zeichnet den Lichtpunkt als leuchtenden Kreis: innen weiß, außen in seiner Farbe", () => {
    const calls = draw({ isDotVisible: true, dot: { x: 1, y: 2 } });

    expect(calls).toEqual([
      "createRadialGradient(20, 30, 0, 20, 30, 3)",
      "gradient.addColorStop(0, #ffffff)",
      "gradient.addColorStop(0.25, #ffffff)",
      "gradient.addColorStop(1, #fa0)",
      "save()",
      "fillStyle = <gradient>",
      "shadowColor = #fa0",
      "shadowBlur = 20",
      "beginPath()",
      "arc(20, 30, 3, 0, 6.283185307179586)",
      "fill()",
      "restore()",
    ]);
  });

  it("zeichnet nichts, wenn der Lichtpunkt nicht zu sehen ist", () => {
    expect(draw({ isDotVisible: false, dot: { x: 1, y: 2 } })).toEqual([]);
  });

  it("zeichnet nichts, solange es keine Stelle für den Lichtpunkt gibt", () => {
    expect(draw({ isDotVisible: true })).toEqual([]);
  });

  it("zeichnet den wartenden Lichtpunkt im Takt des Pulsierens kleiner und größer", () => {
    const dim = draw({ isDotVisible: true, isResting: true, restingPulse: 0, dot: { x: 1, y: 2 } });
    const bright = draw({
      isDotVisible: true,
      isResting: true,
      restingPulse: 1,
      dot: { x: 1, y: 2 },
    });

    expect(dim).toContain("arc(20, 30, 1.5, 0, 6.283185307179586)");
    expect(dim).toContain("shadowBlur = 10");
    expect(bright).toContain("arc(20, 30, 3, 0, 6.283185307179586)");
    expect(bright).toContain("shadowBlur = 20");
  });

  it("zeigt bei gewünschter Ruhe den wartenden Lichtpunkt gleichmäßig hell, ohne Pulsieren", () => {
    const calls = draw(
      { isDotVisible: true, isResting: true, restingPulse: 0, dot: { x: 1, y: 2 } },
      true,
    );

    expect(calls).toContain("arc(20, 30, 3, 0, 6.283185307179586)");
    expect(calls).toContain("shadowBlur = 20");
  });

  it("pulsiert nicht, solange der Lichtpunkt läuft", () => {
    const calls = draw({ isDotVisible: true, restingPulse: 0, dot: { x: 1, y: 2 } });

    expect(calls).toContain("arc(20, 30, 3, 0, 6.283185307179586)");
  });
});
