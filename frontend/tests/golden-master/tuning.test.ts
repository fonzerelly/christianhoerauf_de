// Golden Master Abstimmungswerte: `config/tuning.ts` hält dieselben Werte wie `config.js` des
// Prototyps (Grundwerte, überschrieben vom Geräteprofil). Prozentwerte stehen im Neubau als
// Anteile von 0 bis 1.

import { describe, expect, it } from "vitest";
import { DESKTOP_FROM_WIDTH, TUNING } from "../../src/config/tuning";
import type { ProfileName } from "../../src/config/tuning";
import { loadPrototype } from "./prototype";

interface PrototypeConfig {
  desktopFromWidth: number;
  base: Record<string, number | string | boolean>;
  profiles: Record<ProfileName, Record<string, number | string | boolean>>;
}

const config = loadPrototype(["config.js"]).evaluate<PrototypeConfig>("CONFIG");

/** Die Werte eines Profils im Prototyp: Grundwerte, überschrieben mit denen des Profils. */
function prototypeValues(profile: ProfileName): Record<string, number | string | boolean> {
  return { ...config.base, ...config.profiles[profile] };
}

describe.each(["desktop", "handy"] as const)("Abstimmungswerte des Profils %s", (profile) => {
  const values = prototypeValues(profile);
  const tuning = TUNING[profile];

  it("übernimmt Tempo, Leuchtspur und Weiterschieben unverändert", () => {
    expect(tuning).toMatchObject({
      speed: values.speed,
      connectorSpeedFactor: values.connectorSpeedFactor,
      rushFactor: values.rushFactor,
      scrollSeconds: values.scrollSeconds,
      holdSeconds: values.holdSeconds,
      fadeSeconds: values.fadeSeconds,
      trailWidth: values.trailWidth,
      glow: values.glow,
    });
  });

  it("übernimmt Monitor und Wände, Prozentwerte als Anteile", () => {
    expect(tuning).toMatchObject({
      bloomRadius: values.bloomRadius,
      bloomStrength: Number(values.bloomStrength) / 100,
      scanlineStrength: Number(values.scanlineStrength) / 100,
      vignetteStrength: Number(values.vignetteStrength) / 100,
      flickerStrength: Number(values.flickerStrength) / 100,
      glitchesPerMinute: values.glitchesPerMinute,
      glitchStrength: values.glitchStrength,
      connectorOpacity: Number(values.connectorOpacity) / 100,
      wallWidth: values.wallWidth,
    });
  });

  it("übernimmt die Farben", () => {
    expect(tuning).toMatchObject({
      backgroundColor: values.backgroundColor,
      wallColor: values.wallColor,
      trailColor: values.trailColor,
      dotColor: values.dotColor,
    });
  });

  it("übernimmt die Werte des Labyrinths, Prozentwerte als Anteile", () => {
    expect(tuning).toMatchObject({
      seed: values.seed,
      windiness: Number(values.windiness) / 100,
      detour: Number(values.detour) / 100,
      returnBandRows: values.returnBandRows,
      returnWindiness: Number(values.returnWindiness) / 100,
      maxWallRun: values.maxWallRun,
    });
  });

  it("teilt die Bühne wie der Prototyp ein: feste Spaltenzahl oder feste Zellgröße", () => {
    const columns = Number(values.cellColumns);
    expect(tuning.stageSizing).toEqual(
      columns > 0 ? { columns } : { cellSize: Number(values.cellSize) },
    );
  });

  it("übernimmt die Geräteeinstellungen", () => {
    expect(tuning).toMatchObject({
      maxPixelRatio: values.maxPixelRatio,
      blurInputAfterSending: values.blurInputAfterSending,
    });
  });
});

describe("DESKTOP_FROM_WIDTH", () => {
  it("ist die Fensterbreite, ab der der Prototyp das Profil desktop wählt", () => {
    expect(DESKTOP_FROM_WIDTH).toBe(config.desktopFromWidth);
  });
});

describe("neue Werte des Neubaus", () => {
  it("legt den Haltepunkt zwei Wegstücke hinter die letzte Glyphe und lässt den Lichtpunkt gut sichtbar pulsieren", () => {
    for (const tuning of Object.values(TUNING)) {
      expect(tuning.restingDistance).toBe(2);
      expect(tuning.pulseSeconds).toBeGreaterThan(0);
    }
  });
});
