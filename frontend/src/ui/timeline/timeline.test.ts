import { describe, expect, it } from "vitest";
import type { Cv, Stations } from "../../domain/cv/stations";
import { Timeline } from "./timeline";

const CV: Cv = {
  sections: [
    { name: "beruf", entries: [{ time: "2014 – heute", title: "Entwicklerin", bulletPoints: [] }] },
  ],
};

async function settle(): Promise<void> {
  for (let tick = 0; tick < 4; tick++) await Promise.resolve();
}

function setup(results: (() => Promise<Cv>)[]) {
  const shown: string[] = [];
  let retry: () => void = () => undefined;
  const view = {
    showLoading: () => shown.push("lädt"),
    showError: (onRetry: () => void) => {
      retry = onRetry;
      shown.push("Fehler");
    },
    showStations: (stations: Stations) =>
      shown.push(`Stationen: ${stations.mainTrack.map(({ title }) => title).join(", ")}`),
  };
  let call = 0;
  const source = { load: () => (results[call++] ?? (() => Promise.reject(new Error("keine"))))() };
  const timeline = new Timeline(source, view, 2026);
  return {
    timeline,
    shown,
    retry: () => {
      retry();
    },
  };
}

describe("Timeline", () => {
  it("zeigt beim Laden, dass geladen wird, und dann die Stationen", async () => {
    const { timeline, shown } = setup([() => Promise.resolve(CV)]);

    timeline.load();
    expect(shown).toEqual(["lädt"]);
    await settle();

    expect(shown).toEqual(["lädt", "Stationen: Entwicklerin"]);
  });

  it("zeigt den Fehler, und „Nochmal versuchen“ lädt neu", async () => {
    const { timeline, shown, retry } = setup([
      () => Promise.reject(new Error("503")),
      () => Promise.resolve(CV),
    ]);

    timeline.load();
    await settle();
    retry();
    await settle();

    expect(shown).toEqual(["lädt", "Fehler", "lädt", "Stationen: Entwicklerin"]);
  });

  it("zeichnet die Stationen neu (andere Breite), ohne neu zu laden", async () => {
    const { timeline, shown } = setup([() => Promise.resolve(CV)]);
    timeline.load();
    await settle();

    timeline.refresh();

    expect(shown).toEqual(["lädt", "Stationen: Entwicklerin", "Stationen: Entwicklerin"]);
  });

  it("zeichnet nichts neu, solange keine Stationen da sind", () => {
    const { timeline, shown } = setup([]);

    timeline.refresh();

    expect(shown).toEqual([]);
  });
});
