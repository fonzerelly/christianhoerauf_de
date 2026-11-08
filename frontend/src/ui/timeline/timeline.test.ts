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
  /** Was die Ansicht zeigt: „lädt“, „Fehler“ oder „auf: …“ bzw. „zu: …“ mit den Stationen. */
  const shown: string[] = [];
  let retry: () => void = () => undefined;
  let toggle: () => void = () => undefined;
  const view = {
    showLoading: () => {
      shown.push("lädt");
    },
    showError: (onRetry: () => void) => {
      retry = onRetry;
      shown.push("Fehler");
    },
    showStations: (stations: Stations, display: { expanded: boolean; onToggle: () => void }) => {
      toggle = display.onToggle;
      const titles = stations.mainTrack.map(({ title }) => title).join(", ");
      shown.push(`${display.expanded ? "auf" : "zu"}: ${titles}`);
    },
  };
  let call = 0;
  const source = {
    load: () => (results[call++] ?? (() => Promise.reject(new Error("keine"))))(),
  };
  const transition = {
    run: (render: () => void) => {
      shown.push("Übergang:");
      render();
    },
    finish: () => {
      shown.push("Übergang beendet");
    },
  };
  const timeline = new Timeline(source, view, 2026, transition);
  return {
    timeline,
    shown,
    retry: () => {
      retry();
    },
    toggle: () => {
      toggle();
    },
  };
}

describe("Timeline", () => {
  it("zeigt beim Laden, dass geladen wird, und dann die Stationen aufgeklappt", async () => {
    const { timeline, shown } = setup([() => Promise.resolve(CV)]);

    timeline.load();
    expect(shown).toEqual(["lädt"]);
    await settle();

    expect(shown).toEqual(["lädt", "auf: Entwicklerin"]);
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

    expect(shown).toEqual(["lädt", "Fehler", "lädt", "auf: Entwicklerin"]);
  });

  it("zeichnet die Stationen neu (andere Breite), ohne neu zu laden", async () => {
    const { timeline, shown } = setup([() => Promise.resolve(CV)]);
    timeline.load();
    await settle();

    timeline.refresh();

    expect(shown).toEqual(["lädt", "auf: Entwicklerin", "Übergang beendet", "auf: Entwicklerin"]);
  });

  it("zeichnet nichts neu, solange keine Stationen da sind", () => {
    const { timeline, shown } = setup([]);

    timeline.refresh();

    expect(shown).toEqual(["Übergang beendet"]);
  });

  it("klappt per Klappknopf zu und wieder auf", async () => {
    const { timeline, shown, toggle } = setup([() => Promise.resolve(CV)]);
    timeline.load();
    await settle();

    toggle();
    toggle();

    expect(shown).toEqual([
      "lädt",
      "auf: Entwicklerin",
      "Übergang:",
      "zu: Entwicklerin",
      "Übergang:",
      "auf: Entwicklerin",
    ]);
  });

  it("klappt zu, wenn jemand fragt (Q43); ist sie schon zu, passiert nichts", async () => {
    const { timeline, shown } = setup([() => Promise.resolve(CV)]);
    timeline.load();
    await settle();

    timeline.collapse();
    timeline.collapse();

    expect(shown).toEqual(["lädt", "auf: Entwicklerin", "Übergang:", "zu: Entwicklerin"]);
  });

  it("merkt sich das Zuklappen, wenn die Stationen noch laden", async () => {
    const { timeline, shown } = setup([() => Promise.resolve(CV)]);
    timeline.load();

    timeline.collapse();
    await settle();

    // Der Übergang läuft ins Leere (vorher war nichts zu sehen), die Stationen kommen zugeklappt.
    expect(shown).toEqual(["lädt", "Übergang:", "zu: Entwicklerin"]);
  });
});
