import { describe, expect, it } from "vitest";
import { TUNING } from "./tuning";

describe.each(["desktop", "handy"] as const)("Abstimmungswerte des Profils %s", (profile) => {
  const tuning = TUNING[profile];

  it("hält das Brummen leise: höchstens ein Zehntel der vollen Verstärkung", () => {
    expect(tuning.humVolume).toBeGreaterThan(0);
    expect(tuning.humVolume).toBeLessThanOrEqual(0.1);
  });

  it("lässt das Brummen um die Netzfrequenz von 50 Hertz wandern, nie bis zur Stille", () => {
    expect(tuning.humBaseHertz).toBe(50);
    expect(tuning.humDriftHertz).toBeLessThan(1);
    expect(tuning.humMinLevel).toBeGreaterThan(0);
    expect(tuning.humMinLevel).toBeLessThan(1);
  });
});

describe("Bühne fester Höhe (ADR 0007, gewählt mit Prototyp 12)", () => {
  it("Desktop: Zellen zu 16 px, 15 Reihen, also 240 px hoch", () => {
    expect(TUNING.desktop.stageSizing).toEqual({ cellSize: 16 });
    expect(TUNING.desktop.stageRows).toBe(15);
  });

  it("Handy: 45 Spalten (10 Zeichen je Zeile), 18 Reihen", () => {
    expect(TUNING.handy.stageSizing).toEqual({ columns: 45 });
    expect(TUNING.handy.stageRows).toBe(18);
  });

  it("Desktop: Wände, Spur, Leuchten und Bildstörung im Verhältnis 16 zu 24 px dünner", () => {
    expect(TUNING.desktop).toMatchObject({
      wallWidth: 2,
      trailWidth: 3.5,
      glow: 11,
      bloomRadius: 5,
      glitchStrength: 9,
    });
  });

  it("Handy: Wände, Spur und Leuchten wie in Prototyp 12 (≈ 8 px je Zelle)", () => {
    expect(TUNING.handy).toMatchObject({
      wallWidth: 1.1,
      trailWidth: 2.2,
      glow: 5,
      bloomRadius: 2.5,
      bloomStrength: 0.7,
      glitchStrength: 6,
    });
  });

  it.each(["desktop", "handy"] as const)("%s: dunkle Ecken schwach (20 Prozent)", (profile) => {
    expect(TUNING[profile].vignetteStrength).toBe(0.2);
  });
});
