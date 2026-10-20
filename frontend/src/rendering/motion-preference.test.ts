import { describe, expect, it } from "vitest";
import { MediaQueryMotionPreference } from "./motion-preference";

describe("MediaQueryMotionPreference", () => {
  it("meldet, ob der Besucher weniger Bewegung wünscht", () => {
    expect(new MediaQueryMotionPreference({ matches: true }).isReduced).toBe(true);
    expect(new MediaQueryMotionPreference({ matches: false }).isReduced).toBe(false);
  });

  it("liest den Wunsch bei jeder Frage neu, denn der Besucher kann ihn während des Besuchs ändern", () => {
    const query = { matches: false };
    const preference = new MediaQueryMotionPreference(query);

    query.matches = true;

    expect(preference.isReduced).toBe(true);
  });
});
