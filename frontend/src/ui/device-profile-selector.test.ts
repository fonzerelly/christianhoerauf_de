import { describe, expect, it } from "vitest";
import { selectProfile } from "./device-profile-selector";

describe("selectProfile", () => {
  it("wählt desktop ab 700 Pixeln Fensterbreite, darunter handy", () => {
    expect(selectProfile(699)).toBe("handy");
    expect(selectProfile(700)).toBe("desktop");
    expect(selectProfile(1440)).toBe("desktop");
    expect(selectProfile(390)).toBe("handy");
  });

  it("folgt dem Wunsch aus der Adresse, wenn es einen gibt", () => {
    expect(selectProfile(1440, "handy")).toBe("handy");
    expect(selectProfile(390, "desktop")).toBe("desktop");
  });
});
