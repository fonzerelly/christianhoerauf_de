import { describe, expect, it } from "vitest";
import { closesKeyboardAfterSending } from "./on-screen-keyboard";

describe("closesKeyboardAfterSending", () => {
  it("verlässt das Fragefeld, wenn das Profil es will und das Gerät einen Touchscreen hat", () => {
    expect(closesKeyboardAfterSending(true, true)).toBe(true);
  });

  it("behält den Fokus am Rechner, auch im schmalen Fenster mit Handy-Profil", () => {
    expect(closesKeyboardAfterSending(true, false)).toBe(false);
  });

  it("behält den Fokus, wenn das Profil es nicht will", () => {
    expect(closesKeyboardAfterSending(false, true)).toBe(false);
    expect(closesKeyboardAfterSending(false, false)).toBe(false);
  });
});
