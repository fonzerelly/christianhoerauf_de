import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cvUrlOf, HttpCvSource, readCv } from "./http-cv-source";

/** Ein ausgedachter Lebenslauf im Format von /lebenslauf (backend/schema/lebenslauf.schema.json). */
const FICTIONAL = JSON.parse(
  readFileSync(new URL("../../tests/fixtures/lebenslauf.json", import.meta.url), "utf8"),
) as unknown;

function respond(status: number, body: unknown) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

describe("readCv", () => {
  it("übersetzt Abschnitte und Einträge in die Domäne", () => {
    const cv = readCv(FICTIONAL);

    expect(cv.sections.map(({ name }) => name)).toEqual([
      "beruf",
      "lehre",
      "studium",
      "zivildienst",
      "projekte",
    ]);
    expect(cv.sections[0]?.entries[0]).toEqual({
      time: "10/2020 – heute",
      title: "Entwicklerin",
      organization: "Beispiel AG",
      bulletPoints: ["Datenstrecke mit Kafka", "Neues Frontend"],
    });
  });

  it("nimmt Projekte ohne Zeitraum und ohne Stichpunkte", () => {
    expect(readCv(FICTIONAL).sections[4]?.entries[0]).toEqual({
      title: "Ein Beispielprojekt",
      bulletPoints: [],
    });
  });

  it.each([
    ["kein Objekt", "Text"],
    ["ohne Abschnitte", {}],
    ["Abschnitt ohne Namen", { abschnitte: [{ eintraege: [] }] }],
    ["Abschnitt ohne Einträge", { abschnitte: [{ name: "beruf" }] }],
    ["Eintrag ohne Titel", { abschnitte: [{ name: "beruf", eintraege: [{ zeit: "2014" }] }] }],
    [
      "Stichpunkt kein Text",
      { abschnitte: [{ name: "beruf", eintraege: [{ titel: "A", stichpunkte: [1] }] }] },
    ],
  ])("wirft bei unbrauchbarem Inhalt: %s", (_name, json) => {
    expect(() => readCv(json)).toThrow("/lebenslauf");
  });
});

describe("HttpCvSource", () => {
  it("holt den Lebenslauf der Variante aus dem persönlichen Link", async () => {
    const urls: string[] = [];
    const source = new HttpCvSource({
      url: "https://backend.test/lebenslauf",
      variant: 4711,
      fetchFunction: (url) => {
        urls.push(url);
        return respond(200, FICTIONAL);
      },
    });

    const cv = await source.load();

    expect(urls).toEqual(["https://backend.test/lebenslauf?variante=4711"]);
    expect(cv.sections).toHaveLength(5);
  });

  it("holt ohne Variante den ganzen", async () => {
    const urls: string[] = [];
    const source = new HttpCvSource({
      url: "/lebenslauf",
      fetchFunction: (url) => {
        urls.push(url);
        return respond(200, FICTIONAL);
      },
    });

    await source.load();

    expect(urls).toEqual(["/lebenslauf"]);
  });

  it("scheitert bei einem Fehlerstatus", async () => {
    const source = new HttpCvSource({ url: "/lebenslauf", fetchFunction: () => respond(503, {}) });

    await expect(source.load()).rejects.toThrow("503");
  });
});

describe("cvUrlOf", () => {
  it("liegt beim Backend der Antworten unter /lebenslauf", () => {
    expect(cvUrlOf("https://abc.lambda-url.eu-central-1.on.aws/", false)).toBe(
      "https://abc.lambda-url.eu-central-1.on.aws/lebenslauf",
    );
  });

  it("geht im Dev-Server über die eigene Herkunft (Vite leitet weiter, die Herkunftssperre greift nicht)", () => {
    expect(cvUrlOf("https://abc.lambda-url.eu-central-1.on.aws/", true)).toBe("/lebenslauf");
  });

  it("gibt es ohne Backend nicht", () => {
    expect(cvUrlOf(undefined, false)).toBeUndefined();
    expect(cvUrlOf("", true)).toBeUndefined();
  });
});
