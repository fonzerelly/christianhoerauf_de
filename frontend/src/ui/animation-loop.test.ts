import { describe, expect, it } from "vitest";
import { AnimationLoop } from "./animation-loop";

function setup() {
  const ticks: number[] = [];
  let refreshes = 0;
  let restarts = 0;
  const seconds = [0, 0.016, 0.017];
  let frame: (() => void) | undefined;
  let framesRequested = 0;
  const loop = new AnimationLoop(
    {
      tick: (elapsed) => {
        ticks.push(elapsed);
      },
      refresh: () => {
        refreshes++;
      },
    },
    {
      secondsSinceLastFrame: () => seconds.shift() ?? 0,
      restart: () => {
        restarts++;
      },
    },
    (callback) => {
      framesRequested++;
      frame = callback;
    },
  );
  return {
    loop,
    ticks,
    refreshes: () => refreshes,
    restarts: () => restarts,
    framesRequested: () => framesRequested,
    runFrame: () => frame?.(),
  };
}

describe("AnimationLoop", () => {
  it("fordert beim Start das erste Bild an und tut noch nichts", () => {
    const { loop, ticks, framesRequested } = setup();

    loop.start();

    expect(framesRequested()).toBe(1);
    expect(ticks).toEqual([]);
  });

  it("führt in jedem Bild die Bühne um die vergangene Zeit weiter und fordert das nächste Bild an", () => {
    const { loop, ticks, framesRequested, runFrame } = setup();
    loop.start();

    runFrame();
    runFrame();
    runFrame();

    expect(ticks).toEqual([0, 0.016, 0.017]);
    expect(framesRequested()).toBe(4);
  });

  it("beginnt die Zeitmessung neu, wenn die Seite aus dem Hintergrund zurückkommt, und zeichnet alles neu", () => {
    const { loop, restarts, refreshes } = setup();

    loop.pageVisibilityChanged(true);

    expect(restarts()).toBe(1);
    expect(refreshes()).toBe(1);
  });

  it("beginnt die Zeitmessung auch neu, wenn die Seite in den Hintergrund geht, zeichnet aber nichts neu", () => {
    const { loop, restarts, refreshes } = setup();

    loop.pageVisibilityChanged(false);

    expect(restarts()).toBe(1);
    expect(refreshes()).toBe(0);
  });
});
