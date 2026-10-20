import { describe, expect, it } from "vitest";
import { scriptedRandom } from "../test-support/scripted-random";
import { HumDrift } from "./hum-drift";
import type { HumSettings } from "./hum-settings";

const SETTINGS: HumSettings = {
  humVolume: 0.04,
  humBaseHertz: 50,
  humDriftHertz: 0.4,
  humMinLevel: 0.5,
  humDriftSeconds: 3,
};

describe("HumDrift", () => {
  it("beginnt beim Grundton mit mittlerer Lautstärke", () => {
    const drift = new HumDrift(scriptedRandom(), SETTINGS);

    expect(drift.current).toEqual({ frequency: 50, level: 0.75 });
  });

  it("bleibt bei seinem Ziel, bis die Wanderzeit um ist", () => {
    const drift = new HumDrift(scriptedRandom(0.75, 0.5), SETTINGS);

    expect(drift.advance(1)).toBeUndefined();
    expect(drift.advance(1.9)).toBeUndefined();
  });

  it("würfelt dann ein neues Ziel: Frequenz um den Grundton, Lautstärke zwischen Mindestpegel und 1", () => {
    // Frequenz: 50 + (0,75 - 0,5) * 2 * 0,4 = 50,2; Lautstärke: 0,5 + 0,5 * 0,5 = 0,75
    const drift = new HumDrift(scriptedRandom(0.75, 0.5), SETTINGS);

    const target = drift.advance(3);

    expect(target?.frequency).toBeCloseTo(50.2);
    expect(target?.level).toBeCloseTo(0.75);
  });

  it("reicht weit entfernte Würfelwerte bis an die Grenzen des Wanderbereichs", () => {
    const low = new HumDrift(scriptedRandom(0, 0), SETTINGS).advance(3);
    const high = new HumDrift(scriptedRandom(0.999999, 0.999999), SETTINGS).advance(3);

    expect(low?.frequency).toBeCloseTo(49.6);
    expect(low?.level).toBeCloseTo(0.5);
    expect(high?.frequency).toBeCloseTo(50.4);
    expect(high?.level).toBeCloseTo(1);
  });

  it("merkt sich das neue Ziel als aktuelles und zählt die Wanderzeit neu", () => {
    const drift = new HumDrift(scriptedRandom(0.75, 0.5, 0, 0), SETTINGS);

    const first = drift.advance(3);

    expect(drift.current).toEqual(first);
    expect(drift.advance(2.9)).toBeUndefined();
    expect(drift.advance(0.1)?.frequency).toBeCloseTo(49.6);
  });
});
