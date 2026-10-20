// Beliebige Folgen von Fragen, Antworten und vergehender Zeit: Die Animation darf nie in einen
// unmöglichen Zustand geraten, und am Ende muss immer die Antwort auf die neueste Frage dastehen.

import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { FakePageSource, RESTING_STEP, ROUTE_LENGTH } from "../test-support/fake-page-source";
import { AnswerPlayback } from "./answer-playback";
import { BRIGHTNESS_LEVELS } from "./trail";

const SETTINGS = {
  speed: 16,
  connectorSpeedFactor: 2,
  rushFactor: 8,
  scrollSeconds: 1,
  holdSeconds: 0.5,
  fadeSeconds: 0.5,
  pulseSeconds: 2,
  seed: 100,
};

const event = fc.oneof(
  fc.record({
    kind: fc.constant("ask" as const),
    text: fc.constantFrom("A", "AB", "ABC"),
    arrivesLater: fc.boolean(),
  }),
  fc.record({ kind: fc.constant("arrive" as const) }),
  fc.record({
    kind: fc.constant("advance" as const),
    seconds: fc.double({ min: 0, max: 2, noNaN: true }),
  }),
);

async function settle(): Promise<void> {
  for (let tick = 0; tick < 6; tick++) await Promise.resolve();
}

describe("AnswerPlayback (breit gestreut)", () => {
  it("bleibt in jedem Augenblick in einem möglichen Zustand und schreibt am Ende die neueste Antwort", async () => {
    await fc.assert(
      fc.asyncProperty(fc.array(event, { maxLength: 40 }), async (events) => {
        const source = new FakePageSource();
        const playback = new AnswerPlayback(source, SETTINGS);
        const arrivals: (() => void)[] = [];
        let newestQuestion = "";

        function ask(text: string, arrivesLater: boolean): void {
          newestQuestion = text;
          if (arrivesLater) {
            playback.request(
              new Promise<string>((resolve) => {
                arrivals.push(() => {
                  resolve(text);
                });
              }),
            );
          } else {
            playback.request(Promise.resolve(text));
          }
        }

        function expectPossibleState(): void {
          const page = playback.currentPage;
          if (playback.phase === "writing" || playback.phase === "resting") {
            expect(page).toBeDefined();
          }
          if (playback.phase === "scrolling") expect(playback.nextPage).toBeDefined();
          if (playback.phase === "resting") expect(playback.progress).toBe(RESTING_STEP);
          expect(playback.progress).toBeGreaterThanOrEqual(0);
          expect(playback.progress).toBeLessThanOrEqual(ROUTE_LENGTH - 1);
          expect(playback.scrollPart).toBeGreaterThanOrEqual(0);
          expect(playback.scrollPart).toBeLessThanOrEqual(1);
          for (let step = 1; step < ROUTE_LENGTH; step++) {
            expect(playback.trailLevelOf(step)).toBeLessThanOrEqual(BRIGHTNESS_LEVELS);
          }
        }

        ask("A", false);
        await settle();
        for (const step of events) {
          if (step.kind === "ask") ask(step.text, step.arrivesLater);
          if (step.kind === "arrive") arrivals.shift()?.();
          if (step.kind === "advance") playback.advance(step.seconds);
          await settle();
          expectPossibleState();
        }

        arrivals.forEach((arrive) => {
          arrive();
        });
        await settle();
        for (let second = 0; second < 200; second++) playback.advance(0.5);

        expect(source.requests.at(-1)?.text).toBe(newestQuestion);
        expect(playback.phase).toBe("resting");
      }),
      { numRuns: 300 },
    );
  });
});
