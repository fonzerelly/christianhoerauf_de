import { describe, expect, it } from "vitest";
import { fetchJson } from "./fetch-json";

describe("fetchJson", () => {
  it("holt die Adresse und liefert den JSON-Inhalt", async () => {
    const requested: string[] = [];
    const fetchFunction = (url: string) => {
      requested.push(url);
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ a: 1 }) });
    };

    await expect(fetchJson("/content.json", fetchFunction)).resolves.toEqual({ a: 1 });
    expect(requested).toEqual(["/content.json"]);
  });

  it("scheitert mit der Adresse und dem Status, wenn der Server nicht antwortet wie erwartet", async () => {
    const fetchFunction = () =>
      Promise.resolve({ ok: false, status: 404, json: () => Promise.resolve(undefined) });

    await expect(fetchJson("/content.json", fetchFunction)).rejects.toThrow(
      "/content.json: Status 404",
    );
  });
});
