import { describe, expect, it } from "vitest";
import { FakePageSource, ROUTE_LENGTH, RESTING_STEP } from "./fake-page-source";

describe("FakePageSource", () => {
  it("macht aus jedem Zeichen des Texts eine kleine Seite", async () => {
    const { pages } = await new FakePageSource().paginate("ABC", 7);

    expect(pages).toHaveLength(3);
    for (const page of pages) expect(page.route).toHaveLength(ROUTE_LENGTH);
  });

  it("gibt jeder Seite einen eigenen Ausgang, damit Tests sie unterscheiden können", async () => {
    const { pages } = await new FakePageSource().paginate("AB", 7);

    expect(pages[0]?.exit).not.toEqual(pages[1]?.exit);
  });

  it("legt den Haltepunkt der letzten Seite fest und kennt ihn für jede Seite", async () => {
    const source = new FakePageSource();
    const { pages, restingStepIndex } = await source.paginate("AB", 7);

    expect(restingStepIndex).toBe(RESTING_STEP);
    expect(pages.map((page) => source.restingStepOf(page))).toEqual([RESTING_STEP, RESTING_STEP]);
  });

  it("merkt sich jede Anfrage mit Text, Startwert und Anschluss, sobald sie gestellt wird", async () => {
    const source = new FakePageSource();
    const first = await source.paginate("A", 7);
    const exit = first.pages[0]?.exit;

    void source.paginate("B", 8, exit);

    expect(source.requests).toEqual([
      { text: "A", seed: 7, exitBefore: undefined },
      { text: "B", seed: 8, exitBefore: exit },
    ]);
  });

  it("hält die Seiten auf Wunsch zurück, bis der Test sie freigibt", async () => {
    const source = new FakePageSource();
    source.holdResults();
    let delivered = false;

    const result = source.paginate("A", 7).then((answer) => {
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
