import { describe, expect, it } from "vitest";
import type { Station, Stations } from "../../domain/cv/stations";
import { layOutExpanded } from "../../domain/timeline/scale";
import { FakeElement, fakeDocument } from "../../test-support/fake-dom";
import { TimelineView } from "./timeline-view";

const TODAY = 2026;

/** Aufgeklappt, ohne dass das Klappen etwas tut. */
const EXPANDED = { expanded: true, onToggle: () => undefined };

/** Das erste Element mit der Klasse, sonst ein leeres (dann scheitert die Erwartung daran). */
function first(root: FakeElement, className: string): FakeElement {
  return root.findAll(className)[0] ?? new FakeElement("fehlt");
}

function station(id: number, from: number, extra: Partial<Station> = {}): Station {
  return {
    id,
    section: "beruf",
    time: String(from),
    title: `Titel ${String(id)}`,
    bulletPoints: [],
    from,
    to: from + 1,
    ...extra,
  };
}

const STATIONS: Stations = {
  careerStart: 2010,
  mainTrack: [
    station(0, 2000, { section: "schule", title: "Schule" }),
    station(1, 2010, { organization: "Beispiel AG", title: "Entwicklerin" }),
  ],
  engagements: [
    station(2, 2015, {
      section: "lehre",
      title: "Lehrauftrag, nebenher",
      organization: "Hochschule",
      time: "2015 – heute",
    }),
  ],
};

function setup() {
  const container = new FakeElement("section");
  container.hidden = true;
  const connected: Record<string, FakeElement>[] = [];
  const clicked: string[] = [];
  let redraws = 0;
  const view = new TimelineView({
    onStationClick: (station, button) => {
      clicked.push(`${station.title} @ ${button.className}`);
    },
    onRedraw: () => {
      redraws++;
    },
    connectScrolling: (elements) => {
      connected.push({ ...elements });
    },
    document: fakeDocument,
    container,
    measureWidth: () => 100,
    measureHeight: () => 60,
    visibleWidth: () => 800,
    scrollWidth: () => 1234,
    minPixelsPerYear: 34,
    today: TODAY,
  });
  return { container, view, connected, clicked, redraws: () => redraws };
}

describe("TimelineView", () => {
  it("sagt, dass die Stationen geladen werden", () => {
    const { container, view } = setup();

    view.showLoading();

    expect(container.hidden).toBe(false);
    expect(container.childTexts()).toEqual(["timeline-status: Stationen werden geladen …"]);
  });

  it("sagt, wenn die Stationen nicht erreichbar sind, und lässt es nochmal versuchen", () => {
    const { container, view } = setup();
    let retries = 0;

    view.showError(() => {
      retries++;
    });

    expect(container.allText()).toBe(
      "Die Stationen sind gerade nicht erreichbar.Nochmal versuchen",
    );
    first(container, "timeline-retry").click();
    expect(retries).toBe(1);
  });

  describe("aufgeklappt", () => {
    const { container, view } = setup();
    view.showStations(STATIONS, EXPANDED);
    const layout = layOutExpanded(
      STATIONS,
      [112, 112],
      {
        availableWidth: 800,
        minPixelsPerYear: 34,
        todaySpace: 64,
        labelAir: 12,
        minEngagementWidth: 40,
      },
      TODAY,
    );

    it("zeigt je Station Jahr, Organisation und Titel als Knopf", () => {
      const buttons = container.findAll("timeline-station-button");

      expect(buttons.map((button) => button.allText())).toEqual([
        "2000Schule",
        "2010Beispiel AGEntwicklerin",
      ]);
      expect(buttons.map((button) => button.attributes.get("data-station"))).toEqual(["0", "1"]);
      expect(buttons[0]?.attributes.get("type")).toBe("button");
    });

    it("legt die Stationen nach dem Maßstab unter die Linie (Beschriftung 100 px + 12 px Luft)", () => {
      const stations = container.findAll("timeline-station");

      expect(
        stations.map((element) => [element.styleOf("left"), element.styleOf("width")]),
      ).toEqual(layout.sections.map(({ x, width }) => [`${String(x)}px`, `${String(width)}px`]));
      expect(stations[0]?.styleOf("top")).toBe("28px");
    });

    it("stellt Engagements über die Linie, beschriftet mit Titel und Organisation, ganz im Tooltip", () => {
      const engagement = first(container, "timeline-engagement");
      const button = first(engagement, "timeline-engagement-button");
      const [placed = { left: -1, maxLabelWidth: -1 }] = layout.engagements;

      expect(button.textContent).toBe("Lehrauftrag · Hochschule");
      expect(button.attributes.get("title")).toBe("2015 – heute · Lehrauftrag · Hochschule");
      expect(button.attributes.get("aria-label")).toBe("Lehrauftrag · Hochschule, 2015 – heute");
      expect(engagement.styleOf("left")).toBe(`${String(placed.left)}px`);
      expect(engagement.styleOf("top")).toBe("2px");
      expect(button.styleOf("max-width")).toBe(`${String(placed.maxLabelWidth)}px`);
    });

    it("zieht die Linie bis zum Ende und stellt „heute“ dahinter", () => {
      const axis = first(container, "timeline-axis");
      const today = first(container, "timeline-today");

      expect(axis.styleOf("width")).toBe(`${String(layout.lineEnd)}px`);
      expect(axis.styleOf("top")).toBe("26px");
      expect(today.textContent).toBe("heute");
      expect(today.styleOf("left")).toBe(`${String(layout.lineEnd + 10)}px`);
    });

    it("macht den Inhalt so breit wie die Zeitleiste und so hoch wie die Stationen", () => {
      const content = first(container, "timeline-content");

      expect(content.styleOf("width")).toBe(`${String(layout.contentWidth)}px`);
      expect(content.styleOf("height")).toBe("96px");
    });

    it("zeigt beim Laden „heute“ am rechten Rand", () => {
      expect(first(container, "timeline-scroll").scrollLeft).toBe(1234);
    });
  });

  it("rahmt den Inhalt: links „‹“, rechts „›“, darunter die Bahn mit dem Griff; und verbindet sie zum Verschieben", () => {
    const { container, view, connected } = setup();

    view.showStations(STATIONS, EXPANDED);

    const frame = first(container, "timeline-frame");
    expect(frame.children.map(({ className }) => className)).toEqual([
      "timeline-arrow earlier",
      "timeline-scroll",
      "timeline-arrow later",
      "timeline-bottom",
    ]);
    const [earlier, , later, bottom] = frame.children;
    expect([earlier?.textContent, later?.textContent]).toEqual(["‹", "›"]);
    expect([earlier?.attributes.get("aria-label"), later?.attributes.get("aria-label")]).toEqual([
      "Früher",
      "Später",
    ]);
    const track = first(container, "timeline-track");
    expect(bottom?.children).toEqual([track, first(container, "timeline-fold")]);
    expect(track.attributes.get("aria-hidden")).toBe("true");
    expect(connected).toEqual([
      {
        frame,
        scroll: first(container, "timeline-scroll"),
        earlier,
        later,
        track,
        thumb: first(container, "timeline-thumb"),
      },
    ]);
  });

  it("legt die Linie ohne Engagements nach oben", () => {
    const { container, view } = setup();

    view.showStations({ ...STATIONS, engagements: [] }, EXPANDED);

    expect(first(container, "timeline-axis").styleOf("top")).toBe("0px");
  });

  describe("Klappknopf", () => {
    it("ist der Fuß unter „›“: hinter der Bahn, aufgeklappt mit ▴, und klappt per Klick", () => {
      const { container, view } = setup();
      let toggles = 0;

      view.showStations(STATIONS, {
        expanded: true,
        onToggle: () => {
          toggles++;
        },
      });

      const fold = first(container, "timeline-fold");
      expect(
        first(container, "timeline-bottom").children.map(({ className }) => className),
      ).toEqual(["timeline-track", "timeline-fold"]);
      expect(fold.textContent).toBe("▴");
      expect(fold.attributes.get("aria-expanded")).toBe("true");
      expect(fold.attributes.get("aria-label")).toBe("Zeitleiste zuklappen");
      fold.click();
      expect(toggles).toBe(1);
    });
  });

  describe("zugeklappt", () => {
    const { container, view, connected } = setup();
    view.showStations(
      {
        ...STATIONS,
        engagements: [
          ...STATIONS.engagements,
          station(3, 2010, { section: "lehre", title: "Gleichzeitig", organization: "Verein" }),
        ],
      },
      { expanded: false, onToggle: () => undefined },
    );

    it("zeigt eine Zeile „Jahr Name“ nach Beginn, bei gleichem Beginn der Beruf vorn, Engagements blasser", () => {
      const entries = container.findAll("timeline-entry");

      expect(entries.map(({ textContent }) => textContent)).toEqual([
        "2000 Schule",
        "2010 Beispiel",
        "2010 Verein",
        "2015 Hochschule",
      ]);
      expect(entries.map(({ className }) => className.includes("engagement"))).toEqual([
        false,
        false,
        true,
        true,
      ]);
      expect(entries.map((entry) => entry.attributes.get("data-station"))).toEqual([
        "0",
        "1",
        "3",
        "2",
      ]);
    });

    it("trennt mit Punkten und endet mit „heute“; keine Linie", () => {
      const line = first(container, "timeline-line");

      expect(line.allText()).toBe("2000 Schule·2010 Beispiel·2010 Verein·2015 Hochschule·heute");
      expect(container.findAll("timeline-axis")).toEqual([]);
      expect(first(container, "timeline-frame").className).toBe("timeline-frame collapsed");
    });

    it("hat einen Klappknopf mit ▾, der aufklappt", () => {
      const fold = first(container, "timeline-fold");

      expect(fold.textContent).toBe("▾");
      expect(fold.attributes.get("aria-expanded")).toBe("false");
      expect(fold.attributes.get("aria-label")).toBe("Zeitleiste aufklappen");
    });

    it("lässt sich verschieben und zeigt „heute“ am rechten Rand", () => {
      expect(connected).toHaveLength(1);
      expect(first(container, "timeline-scroll").scrollLeft).toBe(1234);
    });

    it("nennt Punkte und „heute“ für den Übergang beim Klappen", () => {
      expect(
        container.findAll("timeline-separator").map((dot) => dot.attributes.get("data-transition")),
      ).toEqual(["separator-1", "separator-2", "separator-3", "separator-4"]);
      expect(first(container, "timeline-today").attributes.get("data-transition")).toBe("today");
    });
  });

  it("nennt „heute“ auch aufgeklappt für den Übergang", () => {
    const { container, view } = setup();

    view.showStations(STATIONS, EXPANDED);

    expect(first(container, "timeline-today").attributes.get("data-transition")).toBe("today");
    expect(first(container, "timeline-frame").className).toBe("timeline-frame expanded");
  });

  describe("Stationsmenü", () => {
    it("meldet einen Klick auf eine Station, ein Engagement oder einen Eintrag der Zeile", () => {
      const expanded = setup();
      expanded.view.showStations(STATIONS, EXPANDED);
      first(expanded.container, "timeline-station-button").click();
      first(expanded.container, "timeline-engagement-button").click();

      const collapsed = setup();
      collapsed.view.showStations(STATIONS, { expanded: false, onToggle: () => undefined });
      first(collapsed.container, "timeline-entry").click();

      expect(expanded.clicked).toEqual([
        "Schule @ timeline-station-button",
        "Lehrauftrag, nebenher @ timeline-engagement-button",
      ]);
      expect(collapsed.clicked).toEqual(["Schule @ timeline-entry"]);
    });

    it("zeigt an jedem Knopf, dass sein Menü zu ist", () => {
      const { container, view } = setup();

      view.showStations(STATIONS, EXPANDED);

      expect(first(container, "timeline-station-button").attributes.get("aria-expanded")).toBe(
        "false",
      );
    });

    it("meldet jedes Neuzeichnen (ein offenes Menü schließt dann)", () => {
      const { view, redraws } = setup();

      view.showStations(STATIONS, EXPANDED);
      view.showStations(STATIONS, EXPANDED);

      expect(redraws()).toBe(2);
    });
  });
});
