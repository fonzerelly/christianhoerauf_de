import { describe, expect, it } from "vitest";
import type { Phase, Playback } from "../animation/playback-view";
import { lastOf } from "../domain/lists";
import type { Renderer } from "../rendering/renderer";
import type { StageLayout } from "../rendering/stage-layout";
import { playbackView } from "../test-support/fake-playback-view";
import { Stage } from "./stage";

const LAYOUT: StageLayout = {
  viewWidth: 390,
  viewHeight: 700,
  pixelRatio: 2,
  cellSize: 11,
  columns: 34,
  rows: 60,
  offsetX: 8,
  offsetY: 20,
};

/** Ein Ablauf, der Aufrufe festhält und dessen Zustand der Test von Hand setzt. */
class FakePlayback implements Playback {
  public readonly requests: Promise<string>[] = [];
  public readonly advances: number[] = [];
  public phase: Phase = "waiting";
  public isAnimating = false;
  public answersWritten = 0;
  private readonly view = playbackView({});

  public constructor(
    public readonly layout: StageLayout,
    public readonly firstSeed: number,
  ) {}

  public request(reply: Promise<string>): void {
    this.requests.push(reply);
  }

  public advance(seconds: number): void {
    this.advances.push(seconds);
  }

  public get isScrolling() {
    return this.view.isScrolling;
  }
  public get isResting() {
    return this.view.isResting;
  }
  public get currentPage() {
    return this.view.currentPage;
  }
  public get nextPage() {
    return this.view.nextPage;
  }
  public get progress() {
    return this.view.progress;
  }
  public get isDotVisible() {
    return this.view.isDotVisible;
  }
  public get scrollPart() {
    return this.view.scrollPart;
  }
  public get restingPulse() {
    return this.view.restingPulse;
  }
  public dotPosition() {
    return this.view.dotPosition();
  }
  public trailLevelOf(step: number) {
    return this.view.trailLevelOf(step);
  }
  public firstGlowingStep() {
    return this.view.firstGlowingStep();
  }
}

class FakeRenderer implements Renderer {
  public readonly resized: StageLayout[] = [];
  public readonly drawn: { view: Playback; seconds: number }[] = [];
  public discards = 0;
  public isGlitching = false;

  public resize(layout: StageLayout): void {
    this.resized.push(layout);
  }

  public draw(view: Playback, seconds: number): void {
    this.drawn.push({ view, seconds });
  }

  public discardPreparedImages(): void {
    this.discards++;
  }
}

function setup(baseSeed = 100) {
  const renderer = new FakeRenderer();
  const shownPhases: Phase[] = [];
  const playbacks: FakePlayback[] = [];
  const humUpdates: { seconds: number; isGlitching: boolean }[] = [];
  let nextLayout = LAYOUT;
  const stage = new Stage({
    renderer,
    measure: () => nextLayout,
    createPlayback: (layout, firstSeed) => {
      const playback = new FakePlayback(layout, firstSeed);
      playbacks.push(playback);
      return playback;
    },
    baseSeed,
    phaseDisplay: {
      show: (phase) => {
        shownPhases.push(phase);
      },
    },
    hum: {
      update: (seconds, isGlitching) => {
        humUpdates.push({ seconds, isGlitching });
      },
    },
  });
  return {
    stage,
    shownPhases,
    humUpdates,
    renderer,
    playbacks,
    current: () => lastOf(playbacks),
    resizeTo: (layout: StageLayout) => {
      nextLayout = layout;
    },
  };
}

async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe("Stage", () => {
  describe("Start", () => {
    it("baut den Ablauf für die gemessene Bühne mit dem Grundstartwert", () => {
      const { playbacks, renderer } = setup(100);

      expect(playbacks).toHaveLength(1);
      expect(playbacks[0]?.layout).toBe(LAYOUT);
      expect(playbacks[0]?.firstSeed).toBe(100);
      expect(renderer.resized).toEqual([]);
    });

    it("kennt die Größe der Bühne, für die gebaut wurde", () => {
      const { stage } = setup();

      expect(stage.builtFor).toEqual({ width: 390, height: 700 });
    });
  });

  describe("tick", () => {
    it("lässt die Zeit vergehen und zeichnet das erste Bild auch dann, wenn nichts läuft", () => {
      const { stage, renderer, current } = setup();

      stage.tick(0.0625);

      expect(current().advances).toEqual([0.0625]);
      expect(renderer.drawn).toHaveLength(1);
      expect(renderer.drawn[0]?.seconds).toBe(0.0625);
      expect(renderer.drawn[0]?.view).toBe(current());
    });

    it("zeichnet jedes Bild, solange die Animation läuft", () => {
      const { stage, renderer, current } = setup();
      current().isAnimating = true;

      stage.tick(0.1);
      stage.tick(0.1);
      stage.tick(0.1);

      expect(renderer.drawn).toHaveLength(3);
    });

    it("zeichnet nach dem Stillstand noch ein letztes Bild und dann nichts mehr", () => {
      const { stage, renderer, current } = setup();
      current().isAnimating = true;
      stage.tick(0.1);

      current().isAnimating = false;
      stage.tick(0.1);
      expect(renderer.drawn).toHaveLength(2);

      stage.tick(0.1);
      stage.tick(0.1);
      expect(renderer.drawn).toHaveLength(2);
    });

    it("zeichnet weiter, solange eine Bildstörung läuft, auch im Stillstand", () => {
      const { stage, renderer } = setup();
      stage.tick(0.1);
      stage.tick(0.1);
      expect(renderer.drawn).toHaveLength(1);

      renderer.isGlitching = true;
      stage.tick(0.1);

      expect(renderer.drawn).toHaveLength(2);
    });
  });

  describe("Brummen", () => {
    it("meldet dem Brummen in jedem Bild die vergangene Zeit und ob eine Bildstörung läuft", () => {
      const { stage, renderer, humUpdates } = setup();

      stage.tick(0.1);
      renderer.isGlitching = true;
      stage.tick(0.2);

      expect(humUpdates).toEqual([
        { seconds: 0.1, isGlitching: false },
        { seconds: 0.2, isGlitching: true },
      ]);
    });
  });

  describe("Abschnitt", () => {
    it("zeigt in jedem Bild den Abschnitt, in dem die Animation nach dem Weiterlaufen ist", () => {
      const { stage, current, shownPhases } = setup();

      stage.tick(0.1);
      current().phase = "resting";
      stage.tick(0.1);

      expect(shownPhases).toEqual(["waiting", "resting"]);
    });
  });

  describe("show", () => {
    it("gibt die Frage mit dem Versprechen der Antwort an den Ablauf weiter", () => {
      const { stage, current } = setup();
      const reply = Promise.resolve("HALLO");

      stage.show(reply);

      expect(current().requests).toEqual([reply]);
    });
  });

  describe("refresh", () => {
    it("wirft Vorgezeichnetes weg und zeichnet das nächste Bild auch im Stillstand", () => {
      const { stage, renderer } = setup();
      stage.tick(0.1);
      stage.tick(0.1);
      expect(renderer.drawn).toHaveLength(1);

      stage.refresh();
      stage.tick(0.1);

      expect(renderer.discards).toBe(1);
      expect(renderer.drawn).toHaveLength(2);
    });
  });

  describe("rebuild", () => {
    const WIDER = { ...LAYOUT, viewWidth: 500, columns: 45 };

    it("misst die Bühne neu, stellt den Renderer um und baut einen neuen Ablauf", () => {
      const { stage, renderer, playbacks, resizeTo } = setup();
      resizeTo(WIDER);

      stage.rebuild();

      expect(renderer.resized).toEqual([WIDER]);
      expect(playbacks).toHaveLength(2);
      expect(playbacks[1]?.layout).toBe(WIDER);
      expect(stage.builtFor).toEqual({ width: 500, height: 700 });
    });

    it("zeichnet danach ein neues Bild, auch im Stillstand", () => {
      const { stage, renderer, resizeTo } = setup();
      stage.tick(0.1);
      stage.tick(0.1);
      resizeTo(WIDER);

      stage.rebuild();
      stage.tick(0.1);

      expect(renderer.drawn).toHaveLength(2);
      expect(renderer.drawn[1]?.view).not.toBe(renderer.drawn[0]?.view);
    });

    it("schreibt die Antwort, auf die noch gewartet wird, im neuen Ablauf, mit der Nummer, die sie bekommen hätte", () => {
      const { stage, playbacks, current, resizeTo } = setup(100);
      const pending = new Promise<string>(() => undefined);
      stage.show(pending);
      current().answersWritten = 3; // Begrüßung + zwei Antworten sind angekommen
      resizeTo(WIDER);

      stage.rebuild();

      expect(playbacks[1]?.requests).toEqual([pending]);
      expect(playbacks[1]?.firstSeed).toBe(103);
    });

    it("schreibt die letzte Antwort neu, mit demselben Startwert wie zuvor", async () => {
      const { stage, playbacks, current, resizeTo } = setup(100);
      stage.show(Promise.resolve("LETZTE ANTWORT"));
      await settle();
      current().answersWritten = 3;
      resizeTo(WIDER);

      stage.rebuild();

      expect(playbacks[1]?.firstSeed).toBe(102);
      await expect(playbacks[1]?.requests[0]).resolves.toBe("LETZTE ANTWORT");
    });

    it("beginnt wieder beim Grundstartwert, wenn noch keine Antwort angekommen ist", async () => {
      const { stage, playbacks, resizeTo } = setup(100);
      stage.show(Promise.resolve("BEGRÜSSUNG"));
      await settle();
      resizeTo(WIDER);

      stage.rebuild();

      expect(playbacks[1]?.firstSeed).toBe(100);
    });

    it("schreibt nichts, solange noch nie etwas gezeigt wurde", () => {
      const { stage, playbacks, resizeTo } = setup();
      resizeTo(WIDER);

      stage.rebuild();

      expect(playbacks[1]?.requests).toEqual([]);
    });

    it("kennt nach einer überholten Frage nur die neueste", async () => {
      const { stage, playbacks, resizeTo } = setup(100);
      const older = Promise.resolve("ÄLTER");
      const newer = Promise.resolve("NEUER");
      stage.show(older);
      stage.show(newer);
      await settle();
      resizeTo(WIDER);

      stage.rebuild();

      await expect(playbacks[1]?.requests[0]).resolves.toBe("NEUER");
    });
  });
});
