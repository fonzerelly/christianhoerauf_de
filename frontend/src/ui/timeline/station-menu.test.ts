import { describe, expect, it } from "vitest";
import type { Station } from "../../domain/cv/stations";
import { FakeElement, fakeDocument } from "../../test-support/fake-dom";
import { StationMenu } from "./station-menu";

const STATION: Station = {
  id: 1,
  section: "beruf",
  time: "2014 – 2020",
  title: "Beraterin",
  organization: "Muster AG",
  bulletPoints: ["Prozess-Reviews"],
  from: 2014,
  to: 2020,
};

function setup(geometry: { buttonLeft?: number; menuWidth?: number } = {}) {
  const menu = new FakeElement("div");
  menu.hidden = true;
  const input = {
    value: "",
    focused: 0,
    focus() {
      this.focused++;
    },
  };
  let chosen = 0;
  const stationMenu = new StationMenu({
    document: fakeDocument,
    menu,
    questionInput: input,
    onChosen: () => {
      chosen++;
    },
    buttonRect: () => ({ left: geometry.buttonLeft ?? 100, bottom: 400 }),
    menuWidth: () => geometry.menuWidth ?? 300,
    viewportWidth: () => 1440,
    pageScroll: () => ({ x: 0, y: 1000 }),
    edge: 38,
    contains: (element, target) =>
      element === target || element.children.includes(target as FakeElement),
  });
  return { menu, input, stationMenu, chosen: () => chosen };
}

describe("StationMenu", () => {
  it("öffnet unter dem Knopf: Kopfzeile, allgemeine Frage, je Stichpunkt eine", () => {
    const { menu, stationMenu } = setup();
    const button = new FakeElement("button");

    stationMenu.toggle(STATION, button);

    expect(menu.hidden).toBe(false);
    expect(menu.children[0]?.textContent).toBe("2014 – 2020 · Beraterin · Muster AG");
    const items = menu.findAll("station-menu-question");
    expect(items.map(({ textContent }) => textContent)).toEqual([
      "Was hat Chris bei Muster AG gemacht?",
      "Prozess-Reviews",
    ]);
    expect(items[1]?.attributes.get("title")).toBe(
      "Erzähl mir mehr über „Prozess-Reviews“ bei Muster AG.",
    );
    expect(button.attributes.get("aria-expanded")).toBe("true");
    expect(items[0]?.focused).toBe(1);
  });

  it("legt sich unter den Knopf (Seitenkoordinaten), aber nicht über den Rand des Fensters", () => {
    const left = setup();
    left.stationMenu.toggle(STATION, new FakeElement("button"));
    expect([left.menu.styleOf("left"), left.menu.styleOf("top")]).toEqual(["100px", "1404px"]);

    const right = setup({ buttonLeft: 1300 });
    right.stationMenu.toggle(STATION, new FakeElement("button"));
    expect(right.menu.styleOf("left")).toBe("1102px"); // 1440 − 300 − 38

    const edge = setup({ buttonLeft: 10 });
    edge.stationMenu.toggle(STATION, new FakeElement("button"));
    expect(edge.menu.styleOf("left")).toBe("38px");
  });

  it("trägt eine gewählte Frage ins Fragefeld ein, schickt nicht ab, klappt zu, Fokus ins Feld", () => {
    const { menu, input, stationMenu, chosen } = setup();
    stationMenu.toggle(STATION, new FakeElement("button"));

    menu.findAll("station-menu-question")[1]?.click();

    expect(input.value).toBe("Erzähl mir mehr über „Prozess-Reviews“ bei Muster AG.");
    expect(input.focused).toBe(1);
    expect(chosen()).toBe(1);
    expect(menu.hidden).toBe(true);
  });

  it("schließt bei einem zweiten Klick auf denselben Knopf; ein anderer öffnet seins", () => {
    const { menu, stationMenu } = setup();
    const first = new FakeElement("button");
    const second = new FakeElement("button");

    stationMenu.toggle(STATION, first);
    stationMenu.toggle(STATION, second);
    expect(first.attributes.get("aria-expanded")).toBe("false");
    expect(second.attributes.get("aria-expanded")).toBe("true");

    stationMenu.toggle(STATION, second);
    expect(menu.hidden).toBe(true);
    expect(second.attributes.get("aria-expanded")).toBe("false");
  });

  it("schließt mit Esc und gibt den Fokus an den Knopf zurück", () => {
    const { menu, stationMenu } = setup();
    const button = new FakeElement("button");
    stationMenu.toggle(STATION, button);

    stationMenu.escape();

    expect(menu.hidden).toBe(true);
    expect(button.focused).toBe(1);
  });

  it("tut bei Esc nichts, wenn kein Menü offen ist", () => {
    const { stationMenu, menu } = setup();

    stationMenu.escape();

    expect(menu.hidden).toBe(true);
  });

  it("schließt bei einem Klick daneben, nicht bei einem ins Menü oder auf den Knopf", () => {
    const { menu, stationMenu } = setup();
    const button = new FakeElement("button");
    stationMenu.toggle(STATION, button);

    stationMenu.documentClicked(button);
    stationMenu.documentClicked(menu);
    expect(menu.hidden).toBe(false);

    stationMenu.documentClicked(new FakeElement("p"));
    expect(menu.hidden).toBe(true);
  });

  it("tut bei einem Klick nichts, wenn kein Menü offen ist", () => {
    const { stationMenu, menu } = setup();

    stationMenu.documentClicked(new FakeElement("p"));

    expect(menu.hidden).toBe(true);
  });
});
