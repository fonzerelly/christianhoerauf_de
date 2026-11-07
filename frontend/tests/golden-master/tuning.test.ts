// Golden Master Abstimmungswerte: `config/tuning.ts` hält dieselben Werte wie `config.js` des
// Prototyps (Grundwerte, überschrieben vom Geräteprofil). Prozentwerte stehen im Neubau als
// Anteile von 0 bis 1.
//
// Ausgenommen sind die Werte, die mit der flachen Bühne (ADR 0007, Prototyp 12) bewusst anders
// sind: Raster und Reihen, Wand- und Spurbreite, Leuchten, Überstrahlen, Bildstörung, dunkle
// Ecken und das Tempo (×1,5). Die prüft `src/config/tuning.test.ts`.

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

  it("übernimmt Leuchtspur, Weiterschieben und das Verhältnis der Tempi unverändert", () => {
    expect(tuning).toMatchObject({
      connectorSpeedFactor: values.connectorSpeedFactor,
      rushFactor: values.rushFactor,
      scrollSeconds: values.scrollSeconds,
      holdSeconds: values.holdSeconds,
      fadeSeconds: values.fadeSeconds,
    });
  });

  it("übernimmt den Monitor, Prozentwerte als Anteile", () => {
    expect(tuning).toMatchObject({
      bloomStrength: Number(values.bloomStrength) / 100,
      scanlineStrength: Number(values.scanlineStrength) / 100,
      flickerStrength: Number(values.flickerStrength) / 100,
      glitchesPerMinute: values.glitchesPerMinute,
      connectorOpacity: Number(values.connectorOpacity) / 100,
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
