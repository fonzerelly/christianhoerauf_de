import { describe, expect, it } from "vitest";
import { readUrlParameters } from "./url-parameters";

describe("readUrlParameters", () => {
  it("liest den Startwert aus ?seed=", () => {
    expect(readUrlParameters("?seed=123").seed).toBe(123);
    expect(readUrlParameters("?seed=0").seed).toBe(0);
  });

  it("liest das Geräteprofil aus ?profil=", () => {
    expect(readUrlParameters("?profil=handy").profile).toBe("handy");
    expect(readUrlParameters("?profil=desktop").profile).toBe("desktop");
  });

  it("liest beide zugleich, in jeder Reihenfolge", () => {
    expect(readUrlParameters("?profil=handy&seed=7")).toEqual({ seed: 7, profile: "handy" });
  });

  it("meldet nichts, wenn der Parameter fehlt", () => {
    expect(readUrlParameters("")).toEqual({});
    expect(readUrlParameters("?foo=1")).toEqual({});
  });

  it.each(["?seed=", "?seed=abc", "?seed=1.5", "?seed=-3", "?seed=1e3", "?seed=%20", "?seed=12ab"])(
    "ignoriert einen Startwert, der keine ganze Zahl ab 0 ist: %s",
    (query) => {
      expect(readUrlParameters(query).seed).toBeUndefined();
    },
  );

  it.each(["?profil=", "?profil=tablet", "?profil=HANDY"])(
    "ignoriert ein unbekanntes Profil: %s",
    (query) => {
      expect(readUrlParameters(query).profile).toBeUndefined();
    },
  );
});
