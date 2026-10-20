import { describe, expect, it } from "vitest";
import { FakePageSource } from "../test-support/fake-page-source";
import { AnswerPlayback } from "./answer-playback";
import type { PlaybackSettings } from "./playback-settings";

// Alle Zahlen sind Zweierpotenzen, damit die Rechnung mit Sekunden exakt aufgeht:
//   normal:           16 Wegstücke pro Sekunde, also 0,0625 s je Wegstück
//   Schnelldurchlauf: 8-fach, also 0,0078125 s je Wegstück
// Die Attrappen-Seiten haben 12 Wegstücke (0 bis 11); der Haltepunkt ist Wegstück 7.
const SETTINGS: PlaybackSettings = {
  speed: 16,
  connectorSpeedFactor: 1,
  rushFactor: 8,
  scrollSeconds: 1,
  holdSeconds: 0.5,
  fadeSeconds: 0.5,
  pulseSeconds: 2,
  seed: 100,
};
const STEP = 0.0625;
const RUSH_STEP = 0.0078125;
const TO_RESTING = 7 * STEP;
const RESTING_TO_END = 4 * STEP;
const TRAIL_LIFETIME = 1;

/** Lässt alle wartenden Versprechen ihre Folgen ausführen. */
async function settle(): Promise<void> {
  for (let tick = 0; tick < 6; tick++) await Promise.resolve();
}

/** Ein Versprechen, das der Test selbst einlöst - so lässt sich bestimmen, wann die Antwort "kommt". */
function deferredAnswer(): { promise: Promise<string>; resolve: (text: string) => void } {
  let resolve: (text: string) => void = () => undefined;
  const promise = new Promise<string>((resolver) => {
    resolve = resolver;
  });
  return { promise, resolve };
}

async function playbackWithGreeting(text = "A", settings = SETTINGS) {
  const source = new FakePageSource();
  const playback = new AnswerPlayback(source, settings);
  playback.request(Promise.resolve(text));
  await settle();
  return { source, playback };
}

/** Eine Begrüßung, an deren Haltepunkt der Lichtpunkt schon pulsiert. */
async function restingPlayback(text = "A") {
  const result = await playbackWithGreeting(text);
  result.playback.advance(TO_RESTING);
  return result;
}

describe("AnswerPlayback", () => {
  describe("vor der ersten Antwort", () => {
    it("wartet, ohne Seite und ohne Lichtpunkt", () => {
      const playback = new AnswerPlayback(new FakePageSource(), SETTINGS);

      expect(playback.phase).toBe("waiting");
      expect(playback.currentPage).toBeUndefined();
      expect(playback.nextPage).toBeUndefined();
      expect(playback.dotPosition()).toBeUndefined();
      expect(playback.isDotVisible).toBe(false);
    });

    it("hat nichts zu bewegen", () => {
      const playback = new AnswerPlayback(new FakePageSource(), SETTINGS);

      expect(playback.isAnimating).toBe(false);
      expect(playback.isScrolling).toBe(false);
      expect(playback.isResting).toBe(false);
    });

    it("hat noch keine Antwort geschrieben", () => {
      const playback = new AnswerPlayback(new FakePageSource(), SETTINGS);

      expect(playback.answersWritten).toBe(0);
    });

    it("lässt die Uhr trotzdem weiterlaufen, ohne etwas zu tun", () => {
      const playback = new AnswerPlayback(new FakePageSource(), SETTINGS);

      playback.advance(5);

      expect(playback.phase).toBe("waiting");
    });
  });

  describe("Begrüßung", () => {
    it("beginnt zu schreiben, sobald die Antwort da ist, mit dem Startwert der Einstellungen", async () => {
      const { playback, source } = await playbackWithGreeting("Hallo");

      expect(source.requests).toEqual([{ text: "Hallo", seed: 100, exitBefore: undefined }]);
      expect(playback.phase).toBe("writing");
      expect(playback.currentPage).toBeDefined();
      expect(playback.progress).toBe(0);
      expect(playback.isDotVisible).toBe(true);
    });

    it("wartet auf die Antwort, solange sie nicht da ist", async () => {
      const source = new FakePageSource();
      const playback = new AnswerPlayback(source, SETTINGS);
      const greeting = deferredAnswer();

      playback.request(greeting.promise);
      await settle();
      expect(playback.phase).toBe("waiting");

      greeting.resolve("A");
      await settle();
      expect(playback.phase).toBe("writing");
    });

    it("läuft mit dem Tempo der Schriftwege", async () => {
      const { playback } = await playbackWithGreeting();

      playback.advance(2 * STEP);

      expect(playback.progress).toBe(2);
      expect(playback.dotPosition()).toEqual({ x: 2, y: 0 });
    });

    it("bleibt am Haltepunkt stehen und pulsiert, auch wenn viel Zeit vergeht", async () => {
      const { playback } = await playbackWithGreeting();

      playback.advance(TO_RESTING);
      expect(playback.phase).toBe("resting");
      expect(playback.isResting).toBe(true);
      expect(playback.isAnimating).toBe(true);
      expect(playback.progress).toBe(7);
      expect(playback.restingSeconds).toBe(0);

      playback.advance(0.25);
      playback.advance(5);
      expect(playback.phase).toBe("resting");
      expect(playback.progress).toBe(7);
      expect(playback.restingSeconds).toBe(5.25);
      expect(playback.isDotVisible).toBe(true);
    });

    it("pulsiert am Haltepunkt: hell, nach einer halben Schwingung dunkel", async () => {
      const { playback } = await playbackWithGreeting();
      playback.advance(2 * STEP);
      expect(playback.restingPulse).toBe(0);

      playback.advance(5 * STEP);
      expect(playback.restingPulse).toBeCloseTo(1);
      playback.advance(1);
      expect(playback.restingPulse).toBeCloseTo(0);
      playback.advance(1);
      expect(playback.restingPulse).toBeCloseTo(1);
    });

    it("meldet restingSeconds nur am Haltepunkt, sonst 0", async () => {
      const { playback } = await playbackWithGreeting();

      playback.advance(2 * STEP);

      expect(playback.restingSeconds).toBe(0);
    });
  });

  describe("Antwort auf eine Frage, während der Lichtpunkt wartet", () => {
    it("läuft nach dem Eintreffen der Antwort hinaus, lässt die Spur verglimmen und schiebt weiter", async () => {
      const { playback, source } = await restingPlayback();
      const firstPage = playback.currentPage;

      playback.request(Promise.resolve("B"));
      await settle();
      expect(playback.phase).toBe("writing");
      expect(source.requests[1]).toEqual({ text: "B", seed: 101, exitBefore: firstPage?.exit });
      expect(playback.nextPage).toBeDefined();

      playback.advance(RESTING_TO_END);
      expect(playback.phase).toBe("fading");
      expect(playback.isDotVisible).toBe(false);

      playback.advance(TRAIL_LIFETIME - STEP);
      expect(playback.phase).toBe("fading");

      playback.advance(STEP);
      expect(playback.phase).toBe("scrolling");
      expect(playback.isScrolling).toBe(true);
      expect(playback.currentPage).toBe(firstPage);

      playback.advance(SETTINGS.scrollSeconds);
      expect(playback.phase).toBe("writing");
      expect(playback.currentPage).not.toBe(firstPage);
      expect(playback.progress).toBe(0);
      expect(playback.nextPage).toBeUndefined();
    });

    it("pulsiert weiter, bis die Antwort da ist", async () => {
      const { playback } = await restingPlayback();
      const answer = deferredAnswer();

      playback.request(answer.promise);
      playback.advance(10);
      await settle();

      expect(playback.phase).toBe("resting");
      expect(playback.isRushing).toBe(false);

      answer.resolve("B");
      await settle();
      expect(playback.phase).toBe("writing");
    });

    it("läuft nach der Frage nicht schneller", async () => {
      const { playback } = await restingPlayback();
      playback.request(Promise.resolve("B"));
      await settle();

      playback.advance(STEP);

      expect(playback.progress).toBe(8);
    });

    it("zählt die Antworten, deren Seiten angekommen sind", async () => {
      const { playback } = await restingPlayback();
      expect(playback.answersWritten).toBe(1);

      playback.request(Promise.resolve("B"));
      expect(playback.answersWritten).toBe(1);
      await settle();

      expect(playback.answersWritten).toBe(2);
    });

    it("zählt den Startwert bei jeder Antwort um eins hoch", async () => {
      const { playback, source } = await restingPlayback();

      playback.request(Promise.resolve("B"));
      await settle();
      playback.advance(RESTING_TO_END);
      playback.advance(TRAIL_LIFETIME);
      playback.advance(SETTINGS.scrollSeconds);
      playback.advance(TO_RESTING);
      playback.request(Promise.resolve("C"));
      await settle();

      expect(source.requests.map(({ seed }) => seed)).toEqual([100, 101, 102]);
    });

    it("schreibt eine Antwort aus mehreren Seiten Seite für Seite", async () => {
      const { playback } = await playbackWithGreeting("AB");
      const secondPage = playback.nextPage;

      // auf der ersten Seite wird bis zum Ausgang gelaufen, nicht nur bis zum Haltepunkt
      playback.advance(TO_RESTING);
      expect(playback.phase).toBe("writing");
      playback.advance(RESTING_TO_END);
      expect(playback.phase).toBe("fading");
      playback.advance(TRAIL_LIFETIME);
      expect(playback.phase).toBe("scrolling");
      expect(playback.nextPage).toBe(secondPage);

      playback.advance(SETTINGS.scrollSeconds);
      expect(playback.phase).toBe("writing");
      playback.advance(TO_RESTING);
      expect(playback.phase).toBe("resting");
    });
  });

  describe("solange die Seiten der Antwort entstehen", () => {
    it("wartet, ohne Seite und ohne Lichtpunkt, und beginnt zu schreiben, sobald die Seiten da sind", async () => {
      const source = new FakePageSource();
      source.holdResults();
      const playback = new AnswerPlayback(source, SETTINGS);

      playback.request(Promise.resolve("A"));
      await settle();
      expect(source.requests).toHaveLength(1);
      expect(playback.phase).toBe("waiting");
      expect(playback.currentPage).toBeUndefined();

      source.releaseResults();
      await settle();
      expect(playback.phase).toBe("writing");
      expect(playback.currentPage).toBeDefined();
    });

    it("zählt die Antwort erst, wenn ihre Seiten da sind", async () => {
      const source = new FakePageSource();
      source.holdResults();
      const playback = new AnswerPlayback(source, SETTINGS);
      playback.request(Promise.resolve("A"));
      await settle();
      expect(playback.answersWritten).toBe(0);

      source.releaseResults();
      await settle();

      expect(playback.answersWritten).toBe(1);
    });

    it("pulsiert am Haltepunkt weiter, bis die Seiten der Antwort da sind", async () => {
      const { playback, source } = await restingPlayback();
      source.holdResults();

      playback.request(Promise.resolve("B"));
      await settle();
      playback.advance(5);
      expect(playback.phase).toBe("resting");

      source.releaseResults();
      await settle();
      expect(playback.phase).toBe("writing");
    });

    it("schreibt nach einer neueren Frage nur deren Seiten und zählt die überholte Antwort nicht", async () => {
      const { playback, source } = await restingPlayback();
      source.holdResults();

      playback.request(Promise.resolve("B"));
      await settle();
      playback.request(Promise.resolve("CC"));
      await settle();
      source.releaseResults();
      await settle();

      expect(source.requests.map(({ text, seed }) => [text, seed])).toEqual([
        ["A", 100],
        ["B", 101],
        ["CC", 101],
      ]);
      expect(playback.phase).toBe("writing");
      expect(playback.nextPage).toBeDefined(); // "CC" sind zwei Seiten, "B" wäre nur eine
      expect(playback.answersWritten).toBe(2);
    });
  });

  describe("mehrere Fragen hintereinander", () => {
    it("schreibt nur die Antwort auf die neueste Frage", async () => {
      const { playback, source } = await restingPlayback();
      const first = deferredAnswer();
      const second = deferredAnswer();

      playback.request(first.promise);
      playback.request(second.promise);
      first.resolve("X");
      await settle();
      expect(source.requests).toHaveLength(1);
      expect(playback.phase).toBe("resting");

      second.resolve("Y");
      await settle();
      expect(source.requests[1]).toMatchObject({ text: "Y", seed: 101 });
    });

    it("ignoriert eine ältere Antwort, die erst nach der neueren eintrifft", async () => {
      const { playback, source } = await restingPlayback();
      const first = deferredAnswer();
      const second = deferredAnswer();
      playback.request(first.promise);
      playback.request(second.promise);

      second.resolve("Y");
      await settle();
      first.resolve("X");
      await settle();

      expect(source.requests.map(({ text }) => text)).toEqual(["A", "Y"]);
    });
  });

  describe("Frage, während noch geschrieben wird (Schnelldurchlauf)", () => {
    it("läuft im Schnelldurchlauf zum Haltepunkt und pulsiert dort", async () => {
      const { playback } = await playbackWithGreeting();
      playback.advance(2 * STEP);

      playback.request(deferredAnswer().promise);
      expect(playback.isRushing).toBe(true);
      playback.advance(5 * RUSH_STEP);

      expect(playback.phase).toBe("resting");
      expect(playback.progress).toBe(7);
    });

    it("lässt die Seiten der alten Antwort entfallen, die noch nicht zu sehen sind", async () => {
      const { playback, source } = await playbackWithGreeting("AB");
      const firstPage = playback.currentPage;
      const secondPageOfOldAnswer = playback.nextPage;
      expect(secondPageOfOldAnswer).toBeDefined();

      playback.request(Promise.resolve("C"));
      await settle();

      // Die zweite Seite von "AB" ist weg: Die neue Antwort schließt an die erste an.
      expect(source.requests[1]?.exitBefore).toBe(firstPage?.exit);
      expect(playback.nextPage).toBeDefined();
      expect(playback.nextPage).not.toBe(secondPageOfOldAnswer);
    });

    it("hält am Haltepunkt der sichtbaren Seite, auch wenn sie nicht die letzte der alten Antwort war", async () => {
      const { playback } = await playbackWithGreeting("AB");
      const answer = deferredAnswer();

      playback.request(answer.promise);
      playback.advance(7 * RUSH_STEP);

      expect(playback.phase).toBe("resting");
      expect(playback.progress).toBe(7);
    });

    it("läuft ohne Pause weiter, wenn die Antwort schon da ist, und lässt die Spur beim Weiterschieben verglimmen", async () => {
      const { playback } = await playbackWithGreeting();
      playback.advance(2 * STEP);

      playback.request(Promise.resolve("B"));
      await settle();
      playback.advance(5 * RUSH_STEP);
      expect(playback.phase).toBe("writing");
      expect(playback.progress).toBe(7);

      playback.advance(4 * RUSH_STEP);
      expect(playback.phase).toBe("fading");

      playback.advance(RUSH_STEP);
      expect(playback.phase).toBe("scrolling");
    });

    it("läuft nur auf der alten Seite schnell, nicht auf den Seiten der neuen Antwort", async () => {
      const { playback } = await playbackWithGreeting();
      playback.request(Promise.resolve("B"));
      await settle();
      playback.advance(11 * RUSH_STEP);
      playback.advance(RUSH_STEP);
      playback.advance(SETTINGS.scrollSeconds);

      expect(playback.phase).toBe("writing");
      expect(playback.isRushing).toBe(false);
      playback.advance(STEP);
      expect(playback.progress).toBe(1);
    });

    it("eilt auch durch die Seite, die gerade hereinrollt", async () => {
      const { playback, source } = await playbackWithGreeting("AB");
      playback.advance(11 * STEP);
      playback.advance(TRAIL_LIFETIME);
      expect(playback.phase).toBe("scrolling");
      const secondPage = playback.nextPage;

      playback.request(Promise.resolve("C"));
      await settle();
      expect(source.requests[1]?.exitBefore).toBe(secondPage?.exit);
      playback.advance(SETTINGS.scrollSeconds);

      expect(playback.currentPage).toBe(secondPage);
      expect(playback.isRushing).toBe(true);
      playback.advance(RUSH_STEP);
      expect(playback.progress).toBe(1);
    });

    it("wartet ohne Lichtpunkt, wenn die Spur schon verglimmt und noch keine Antwort da ist", async () => {
      const { playback } = await restingPlayback();
      playback.request(Promise.resolve("B"));
      await settle();
      playback.advance(RESTING_TO_END);
      expect(playback.phase).toBe("fading");
      const firstPage = playback.currentPage;

      const answer = deferredAnswer();
      playback.request(answer.promise);
      expect(playback.nextPage).toBeUndefined();
      playback.advance(RUSH_STEP);
      expect(playback.phase).toBe("waiting");
      expect(playback.isDotVisible).toBe(false);

      answer.resolve("C");
      await settle();
      expect(playback.phase).toBe("scrolling");
      expect(playback.currentPage).toBe(firstPage);
    });
  });

  describe("scrollPart", () => {
    it("ist 0 außerhalb des Weiterschiebens", async () => {
      const { playback } = await playbackWithGreeting();

      expect(playback.scrollPart).toBe(0);
    });

    it("steigt beim Weiterschieben sanft von 0 auf 1", async () => {
      const { playback } = await restingPlayback();
      playback.request(Promise.resolve("B"));
      await settle();
      playback.advance(RESTING_TO_END);
      playback.advance(TRAIL_LIFETIME);
      expect(playback.phase).toBe("scrolling");

      expect(playback.scrollPart).toBe(0);
      playback.advance(0.25);
      expect(playback.scrollPart).toBeCloseTo(0.15625);
      playback.advance(0.25);
      expect(playback.scrollPart).toBe(0.5);
      playback.advance(0.25);
      expect(playback.scrollPart).toBeCloseTo(0.84375);
    });

    it("springt ohne Dauer des Weiterschiebens sofort auf 1", async () => {
      const settings = { ...SETTINGS, scrollSeconds: 0 };
      const { playback } = await playbackWithGreeting("A", settings);
      playback.advance(TO_RESTING);
      playback.request(Promise.resolve("B"));
      await settle();
      playback.advance(RESTING_TO_END);
      playback.advance(TRAIL_LIFETIME);

      expect(playback.phase).toBe("scrolling");
      expect(playback.scrollPart).toBe(1);
      playback.advance(0);
      expect(playback.phase).toBe("writing");
    });
  });

  describe("Leuchtspur", () => {
    it("lässt gelaufene Wegstücke erst voll leuchten und dann verglimmen", async () => {
      const { playback } = await playbackWithGreeting();

      playback.advance(2 * STEP);
      expect(playback.trailLevelOf(1)).toBe(16);
      expect(playback.firstGlowingStep()).toBe(1);

      playback.advance(2);
      expect(playback.trailLevelOf(1)).toBe(0);
      expect(playback.firstGlowingStep()).toBe(3);
    });

    it("vergisst die Spur beim Wechsel auf die nächste Seite", async () => {
      const { playback } = await restingPlayback();
      playback.request(Promise.resolve("B"));
      await settle();
      playback.advance(RESTING_TO_END);
      playback.advance(TRAIL_LIFETIME);
      playback.advance(SETTINGS.scrollSeconds);

      expect(playback.firstGlowingStep()).toBe(1);
      expect(playback.trailLevelOf(1)).toBe(16);
    });
  });
});
