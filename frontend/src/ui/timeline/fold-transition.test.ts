import { describe, expect, it } from "vitest";
import { FOLD_DURATION, FOLD_EASING, FoldTransition } from "./fold-transition";
import type { Rect, Snapshot, TransitionPort } from "./fold-transition";

const rect = (left: number, top: number, width = 50, height = 20): Rect => ({
  left,
  top,
  width,
  height,
});

/** Ein Abbild in der Attrappe: nur ein Name. */
type Image = string;

interface Played {
  target: string;
  keyframes: Keyframe[];
}

/** Eine Attrappe des DOM: liefert vorgegebene Bilder der Zeitleiste und schreibt mit, was passiert. */
class FakePort implements TransitionPort<Image> {
  public readonly log: string[] = [];
  public readonly played: Played[] = [];
  public readonly running: { cancelled: boolean; finish: () => void }[] = [];
  public snapshots: (Snapshot<Image> | undefined)[] = [];

  public capture(): Snapshot<Image> | undefined {
    return this.snapshots.shift();
  }
  public openLayer(visible: Rect): Image {
    this.log.push(`Ebene über ${String(visible.left)},${String(visible.top)}`);
    return "Ebene";
  }
  public put(_layer: Image, image: Image, at: Rect): void {
    this.log.push(`${image} bei ${String(at.left)},${String(at.top)}`);
  }
  public wrapSkeleton(_layer: Image, image: Image, at: Rect): Image {
    this.log.push(`Gerippe ${image} bei ${String(at.left)},${String(at.top)}`);
    return "Hülle";
  }
  // Abbilder sind hier Namen; die Zeitleiste selbst heißt "container".
  public animate(target: string, keyframes: Keyframe[], timing: KeyframeAnimationOptions) {
    expect(timing).toEqual({ duration: FOLD_DURATION, easing: FOLD_EASING, fill: "both" });
    this.played.push({ target, keyframes });
    let finish: () => void = () => undefined;
    const finished = new Promise<void>((resolve) => {
      finish = resolve;
    });
    const running = { cancelled: false, finish };
    this.running.push(running);
    return {
      finished,
      cancel: () => {
        running.cancelled = true;
      },
    };
  }
  public setRunning(running: boolean): void {
    this.log.push(running ? "läuft" : "fertig");
  }
  public closeLayer(): void {
    this.log.push("Ebene weg");
  }
}

const EXPANDED: Snapshot<Image> = {
  height: 140,
  visible: rect(40, 300, 1000, 120),
  entries: new Map([
    ["1", { rect: rect(100, 330), image: "Station 1 auf" }],
    ["today", { rect: rect(900, 310), image: "heute auf" }],
  ]),
  skeleton: { rect: rect(40, 300, 1200, 120), image: "Linie" },
};
const COLLAPSED: Snapshot<Image> = {
  height: 60,
  visible: rect(40, 300, 1000, 40),
  entries: new Map([
    ["1", { rect: rect(60, 306), image: "Station 1 zu" }],
    ["separator-1", { rect: rect(120, 306), image: "Punkt" }],
    ["today", { rect: rect(400, 306), image: "heute zu" }],
  ]),
  skeleton: undefined,
};

async function settle(): Promise<void> {
  for (let tick = 0; tick < 4; tick++) await Promise.resolve();
}

function setup(reduced = false) {
  const port = new FakePort();
  const transition = new FoldTransition(port, () => reduced);
  let renders = 0;
  const render = () => {
    renders++;
  };
  return { port, transition, render, renders: () => renders };
}

describe("FoldTransition", () => {
  it("zeichnet bei weniger Bewegung nur neu, ohne Übergang", () => {
    const { port, transition, render, renders } = setup(true);
    port.snapshots = [EXPANDED, COLLAPSED];

    transition.run(render);

    expect(renders()).toBe(1);
    expect(port.played).toEqual([]);
  });

  it("zeichnet nur neu, wenn vorher nichts zu sehen war (Stationen laden noch)", () => {
    const { port, transition, render, renders } = setup();
    port.snapshots = [undefined, COLLAPSED];

    transition.run(render);

    expect(renders()).toBe(1);
    expect(port.played).toEqual([]);
  });

  describe("Zuklappen", () => {
    const { port, transition, render } = setup();
    port.snapshots = [EXPANDED, COLLAPSED];
    transition.run(render);
    const playedOn = (target: string) => port.played.filter((played) => played.target === target);

    it("legt eine Ebene über die Zeitleiste und lässt Ebene und Zeitleiste auf die neue Höhe gleiten", () => {
      expect(port.log.slice(0, 2)).toEqual(["Ebene über 40,300", "läuft"]);
      expect(playedOn("Ebene").map(({ keyframes }) => keyframes)).toEqual([
        [{ height: "120px" }, { height: "40px" }],
      ]);
      expect(playedOn("container").map(({ keyframes }) => keyframes)).toEqual([
        [{ height: "140px" }, { height: "60px" }],
      ]);
    });

    it("wischt die Linie nach links weg", () => {
      expect(port.log).toContain("Gerippe Linie bei 40,300");
      expect(playedOn("Hülle").map(({ keyframes }) => keyframes)).toEqual([
        [
          { clipPath: "inset(0 0 0 0)", opacity: 1 },
          { clipPath: "inset(0 100% 0 0)", opacity: 0.3 },
        ],
      ]);
    });

    it("lässt jeden Eintrag von seiner alten an seine neue Stelle gleiten, das alte Bild aus-, das neue einblendend", () => {
      expect(playedOn("Station 1 auf").map(({ keyframes }) => keyframes)).toEqual([
        [
          { transform: "none", opacity: 1 },
          { opacity: 0, offset: 0.6 },
          { transform: "translate(-40px, -24px)", opacity: 0 },
        ],
      ]);
      expect(playedOn("Station 1 zu").map(({ keyframes }) => keyframes)).toEqual([
        [
          { transform: "translate(40px, 24px)", opacity: 0 },
          { opacity: 0, offset: 0.3 },
          { transform: "none", opacity: 1 },
        ],
      ]);
      expect(port.log).toContain("Station 1 auf bei 100,330");
      expect(port.log).toContain("Station 1 zu bei 60,306");
    });

    it("blendet, was es nur in einem Zustand gibt, an Ort und Stelle (die Punkte der Zeile)", () => {
      expect(playedOn("Punkt").map(({ keyframes }) => keyframes)).toEqual([
        [{ opacity: 0 }, { opacity: 0, offset: 0.5 }, { opacity: 1 }],
      ]);
    });

    it("räumt auf, sobald der Übergang fertig ist", async () => {
      port.running[0]?.finish();
      await settle();

      expect(port.log.slice(-2)).toEqual(["Ebene weg", "fertig"]);
      expect(port.running.every(({ cancelled }) => cancelled)).toBe(true);
    });
  });

  it("wischt die Linie beim Aufklappen von links herein und blendet Verschwindendes aus", () => {
    const { port, transition, render } = setup();
    port.snapshots = [COLLAPSED, EXPANDED];

    transition.run(render);

    expect(port.played.find(({ target }) => target === "Hülle")?.keyframes).toEqual([
      { clipPath: "inset(0 100% 0 0)", opacity: 0.3 },
      { clipPath: "inset(0 0 0 0)", opacity: 1 },
    ]);
    expect(port.played.find(({ target }) => target === "Punkt")?.keyframes).toEqual([
      { opacity: 1 },
      { opacity: 0 },
    ]);
  });

  it("bricht einen laufenden Übergang ab, wenn neu gezeichnet wird, und räumt nur einmal auf", async () => {
    const { port, transition, render } = setup();
    port.snapshots = [EXPANDED, COLLAPSED];
    transition.run(render);

    transition.finish();
    transition.finish();
    port.running[0]?.finish();
    await settle();

    expect(port.log.filter((entry) => entry === "Ebene weg")).toHaveLength(1);
  });

  it("wischt nichts, wenn keiner der beiden Zustände eine Linie hat", () => {
    const { port, transition, render } = setup();
    port.snapshots = [COLLAPSED, COLLAPSED];

    transition.run(render);

    expect(port.played.some(({ target }) => target === "Hülle")).toBe(false);
  });

  it("zeichnet nur neu, wenn nachher nichts zu sehen ist", () => {
    const { port, transition, render, renders } = setup();
    port.snapshots = [EXPANDED, undefined];

    transition.run(render);

    expect(renders()).toBe(1);
    expect(port.played).toEqual([]);
  });
});
