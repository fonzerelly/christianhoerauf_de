import { describe, expect, it } from "vitest";
import { StageSizeWatcher } from "./stage-size-watcher";

/** Verzögerte Aufrufe, die der Test von Hand ablaufen lässt. */
function manualDelay() {
  const waiting: { id: number; callback: () => void; millis: number }[] = [];
  let nextId = 0;
  return {
    delay: (callback: () => void, millis: number) => {
      const id = nextId++;
      waiting.push({ id, callback, millis });
      return () => {
        const index = waiting.findIndex((entry) => entry.id === id);
        if (index >= 0) waiting.splice(index, 1);
      };
    },
    waiting,
    runAll: () => {
      for (const entry of waiting.splice(0)) entry.callback();
    },
  };
}

function setup(options: { isTyping?: boolean } = {}) {
  const stage = { clientWidth: 390, clientHeight: 700 };
  const timers = manualDelay();
  let rebuilds = 0;
  const watcher = new StageSizeWatcher({
    stage,
    builtFor: () => ({ width: 390, height: 700 }),
    isTyping: () => options.isTyping ?? false,
    rebuild: () => {
      rebuilds++;
    },
    delay: timers.delay,
  });
  return { stage, timers, watcher, rebuilds: () => rebuilds };
}

describe("StageSizeWatcher", () => {
  it("wartet 0,3 Sekunden, bis die Größe ruhig ist, bevor es reagiert", () => {
    const { watcher, timers, rebuilds, stage } = setup();
    stage.clientWidth = 500;

    watcher.notifyChange();

    expect(rebuilds()).toBe(0);
    expect(timers.waiting.map((entry) => entry.millis)).toEqual([300]);
  });

  it("prüft nur einmal, auch wenn die Größe sich oft hintereinander ändert", () => {
    const { watcher, timers, rebuilds, stage } = setup();
    stage.clientWidth = 500;

    watcher.notifyChange();
    watcher.notifyChange();
    watcher.notifyChange();
    timers.runAll();

    expect(rebuilds()).toBe(1);
  });

  it("baut neu, wenn sich die Breite geändert hat (Handy gedreht, Fenster gezogen)", () => {
    const { watcher, timers, rebuilds, stage } = setup({ isTyping: true });
    stage.clientWidth = 500;

    watcher.notifyChange();
    timers.runAll();

    expect(rebuilds()).toBe(1);
  });

  it("baut nicht neu, wenn nur die Höhe sich geändert hat, während getippt wird (Bildschirmtastatur)", () => {
    const { watcher, timers, rebuilds, stage } = setup({ isTyping: true });
    stage.clientHeight = 400;

    watcher.notifyChange();
    timers.runAll();

    expect(rebuilds()).toBe(0);
  });

  it("baut neu, wenn nur die Höhe sich geändert hat und nicht getippt wird", () => {
    const { watcher, timers, rebuilds, stage } = setup({ isTyping: false });
    stage.clientHeight = 400;

    watcher.notifyChange();
    timers.runAll();

    expect(rebuilds()).toBe(1);
  });

  it("baut nicht neu, wenn die Größe am Ende dieselbe ist wie beim Bauen", () => {
    const { watcher, timers, rebuilds } = setup();

    watcher.notifyChange();
    timers.runAll();

    expect(rebuilds()).toBe(0);
  });
});
