import { describe, expect, it } from "vitest";
import { scaledLook } from "./scaled-look";
import { TEST_SETTINGS } from "./test-settings";

describe("scaledLook", () => {
  it("macht Wände, Lichthof, Leuchtspur und Schein im Maß der Zellen kleiner, alles andere bleibt", () => {
    expect(scaledLook(TEST_SETTINGS, 0.5)).toEqual({
      ...TEST_SETTINGS,
      wallWidth: 1,
      bloomRadius: 1.5,
      trailWidth: 2,
      glow: 2,
    });
  });
});
