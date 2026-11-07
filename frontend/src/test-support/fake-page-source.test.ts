import { describe, expect, it } from "vitest";
import { FakePageSource, ROUTE_LENGTH, RESTING_STEP, written } from "./fake-page-source";

describe("FakePageSource", () => {
  it("macht aus jedem Zeichen des Texts eine kleine Seite", async () => {
    const { pages } = await new FakePageSource().paginate(written("ABC"), 7);

    expect(pages).toHaveLength(3);
    for (const page of pages) expect(page.route).toHaveLength(ROUTE_LENGTH);
  });

  it("gibt jeder Seite einen eigenen Ausgang, damit Tests sie unterscheiden können", async () => {
    const { pages } = await new FakePageSource().paginate(written("AB"), 7);

    expect(pages[0]?.exit).not.toEqual(pages[1]?.exit);
  });

  it("legt den Haltepunkt der letzten Seite fest und kennt ihn für jede Seite", async () => {
    const source = new FakePageSource();
    const { pages, restingStepIndex } = await source.paginate(written("AB"), 7);

    expect(restingStepIndex).toBe(RESTING_STEP);
    expect(pages.map((page) => source.restingStepOf(page))).toEqual([RESTING_STEP, RESTING_STEP]);
  });

  it("merkt sich jede Anfrage mit Text, Startwert und Anschluss, sobald sie gestellt wird", async () => {
    const source = new FakePageSource();
    const first = await source.paginate(written("A"), 7);
    const exit = first.pages[0]?.exit;

    void source.paginate(written("B"), 8, exit);

    expect(source.requests).toEqual([
      { text: "A", seed: 7, exitBefore: undefined },
      { text: "B", seed: 8, exitBefore: exit },
    ]);
  });

  it("macht aus einem Bild eine einzige Seite und merkt sich das Bild", async () => {
    const source = new FakePageSource();

    const { pages } = await source.paginate({ picture: "heart", keyword: "<3" }, 3);

    expect(pages).toHaveLength(1);
    expect(source.requests).toEqual([
      { text: "<3", picture: "heart", seed: 3, exitBefore: undefined },
    ]);
  });

  it("macht aus einem Foto eine einzige Seite und merkt sich das Foto", async () => {
    const source = new FakePageSource();

    const { pages } = await source.paginate({ photo: "chris", keyword: "Das ist Chris." }, 4);

    expect(pages).toHaveLength(1);
    expect(source.requests).toEqual([
      { text: "Das ist Chris.", photo: "chris", seed: 4, exitBefore: undefined },
    ]);
  });

  it("hält die Seiten auf Wunsch zurück, bis der Test sie freigibt", async () => {
    const source = new FakePageSource();
    source.holdResults();
    let delivered = false;

    const result = source.paginate(written("A"), 7).then((answer) => {
      delivered = true;
      return answer;
    });
    await Promise.resolve();
    expect(delivered).toBe(false);
    expect(source.requests).toHaveLength(1);

    source.releaseResults();

    expect((await result).pages).toHaveLength(1);
  });
});
