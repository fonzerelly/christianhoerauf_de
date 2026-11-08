import { describe, expect, it } from "vitest";
import { readTestHooks } from "./test-hooks";

const VALID = {
  clock: { now: () => 0 },
  requestFrame: () => undefined,
  scheduleTask: () => undefined,
  randomSeed: 7,
};

describe("readTestHooks", () => {
  it("liest Uhr, Bildtakt, Aufgaben-Einreihung und Startwert, die ein Test vor dem Laden der Seite bereitstellt", () => {
    const hooks = readTestHooks({ labyrinthTestHooks: VALID });

    expect(hooks?.clock).toBe(VALID.clock);
    expect(hooks?.requestFrame).toBe(VALID.requestFrame);
    expect(hooks?.scheduleTask).toBe(VALID.scheduleTask);
    expect(hooks?.randomSeed).toBe(7);
  });

  it("liest auch Abstimmungswerte, die ein Test ersetzen will (etwa eine lange Leuchtdauer)", () => {
    const hooks = readTestHooks({ labyrinthTestHooks: { ...VALID, tuning: { holdSeconds: 600 } } });

    expect(hooks?.tuning).toEqual({ holdSeconds: 600 });
  });

  it("liest eine Adresse für den Lebenslauf und ein festes „heute“ (Zeitleiste ohne Backend und ohne Datum)", () => {
    const hooks = readTestHooks({
      labyrinthTestHooks: { ...VALID, cvUrl: "/test-lebenslauf", today: 2026.5 },
    });

    expect(hooks?.cvUrl).toBe("/test-lebenslauf");
    expect(hooks?.today).toBe(2026.5);
  });

  it("liest eine Adresse für die Antworten (Backend-Antworten ohne Backend, etwa ein Fehler 503)", () => {
    const hooks = readTestHooks({ labyrinthTestHooks: { ...VALID, answerUrl: "/test-antwort" } });

    expect(hooks?.answerUrl).toBe("/test-antwort");
  });

  it("kommt ohne Lebenslauf-Adresse, Antwort-Adresse und „heute“ aus", () => {
    const hooks = readTestHooks({ labyrinthTestHooks: VALID });

    expect(hooks?.answerUrl).toBeUndefined();
    expect(hooks?.cvUrl).toBeUndefined();
    expect(hooks?.today).toBeUndefined();
  });

  it("kommt ohne Abstimmungswerte aus", () => {
    expect(readTestHooks({ labyrinthTestHooks: VALID })?.tuning).toEqual({});
  });

  it("liefert nichts, wenn die Seite nicht von einem Test geladen wird", () => {
    expect(readTestHooks({})).toBeUndefined();
  });

  it.each([
    ["kein Objekt", "text"],
    ["null", null],
    ["Uhr fehlt", { ...VALID, clock: undefined }],
    ["Uhr ohne now", { ...VALID, clock: {} }],
    ["Bildtakt fehlt", { ...VALID, requestFrame: undefined }],
    ["Aufgaben-Einreihung fehlt", { ...VALID, scheduleTask: undefined }],
    ["Startwert ist keine Zahl", { ...VALID, randomSeed: "7" }],
    ["Abstimmungswerte sind kein Objekt", { ...VALID, tuning: 5 }],
    ["Lebenslauf-Adresse ist kein Text", { ...VALID, cvUrl: 5 }],
    ["Antwort-Adresse ist kein Text", { ...VALID, answerUrl: 5 }],
    ["„heute“ ist keine Zahl", { ...VALID, today: "2026" }],
  ])("liefert nichts, wenn die Bereitstellung unvollständig ist: %s", (_name, hooks) => {
    expect(readTestHooks({ labyrinthTestHooks: hooks })).toBeUndefined();
  });
});
