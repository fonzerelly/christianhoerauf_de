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
