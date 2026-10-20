import { describe, expect, it } from "vitest";
import { paceOf } from "./pace";
import type { PlaybackSettings } from "./playback-settings";

const SETTINGS: PlaybackSettings = {
  speed: 60,
  connectorSpeedFactor: 3,
  rushFactor: 6,
  scrollSeconds: 1,
  holdSeconds: 0.5,
  fadeSeconds: 1,
  pulseSeconds: 2,
  seed: 1,
};

describe("paceOf", () => {
  it("läuft in Schriftwegen mit dem eingestellten Tempo", () => {
    expect(paceOf("letter", false, SETTINGS)).toBe(60);
  });

  it("läuft auf Verbindungswegen und Sprüngen schneller", () => {
    expect(paceOf("connector", false, SETTINGS)).toBe(180);
    expect(paceOf("silent", false, SETTINGS)).toBe(180);
  });

  it("läuft im Schnelldurchlauf um den Faktor schneller, in jeder Art von Wegstück", () => {
    expect(paceOf("letter", true, SETTINGS)).toBe(360);
    expect(paceOf("connector", true, SETTINGS)).toBe(1080);
  });
});
