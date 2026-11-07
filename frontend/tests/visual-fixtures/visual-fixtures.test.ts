// Die Bildtests laden eigene Inhalte aus visual/fixtures/ statt public/content.json. Passen die
// nicht mehr zum Format, zeigt die Seite dort nur „Das klappt gerade nicht“, und alle Bildtests
// scheitern an etwas ganz anderem als dem, was sie prüfen. Dieser Test merkt das ohne Docker.

import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseContent } from "../../src/answering/content";

const folder = new URL("../../visual/fixtures/", import.meta.url);
const files = readdirSync(folder).filter((name) => name.endsWith(".json"));

describe("Inhalte der Bildtests", () => {
  it("gibt es", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it.each(files)("%s hat das Format von content.json", (name) => {
    const json: unknown = JSON.parse(readFileSync(new URL(name, folder), "utf8"));

    expect(() => parseContent(json)).not.toThrow();
  });
});
