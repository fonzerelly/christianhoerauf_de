import { describe, expect, it } from "vitest";
import { SpokenAnswer } from "./spoken-answer";

describe("SpokenAnswer", () => {
  it("legt die Antwort im Originaltext in den Bereich, den der Screenreader vorliest", () => {
    const region = { textContent: "" };

    new SpokenAnswer(region).show("Ich bin noch ein Prototyp.");

    expect(region.textContent).toBe("Ich bin noch ein Prototyp.");
  });

  it("lässt die Trennstellen-Zeichen weg, denn sie gehören nur zur Darstellung", () => {
    const region = { textContent: "" };

    new SpokenAnswer(region).show("Inter|net|prä|senz");

    expect(region.textContent).toBe("Internetpräsenz");
  });

  it("ersetzt die vorige Antwort", () => {
    const region = { textContent: "" };
    const spoken = new SpokenAnswer(region);

    spoken.show("Eins");
    spoken.show("Zwei");

    expect(region.textContent).toBe("Zwei");
  });
});
