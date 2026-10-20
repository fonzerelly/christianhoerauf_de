// Composition Root: steckt alle Teile der Seite zusammen und sonst nichts. Hier, und nur hier,
// werden die Adapter für Browser, Uhr, Zufall und Antwortquelle ausgewählt.
//
// Die Datei hat keine eigene Logik und steht deshalb nicht in der Unit-Test-Abdeckung (siehe
// vitest.config.ts); dass das Zusammenspiel funktioniert, zeigen die Bildtests.

import { AnswerPlayback } from "./animation/answer-playback";
import { FrameTimer } from "./animation/frame-timer";
import { PerformanceClock } from "./animation/performance-clock";
import { fetchJson } from "./answering/fetch-json";
import { StaticContentAnswerSource } from "./answering/static-content-answer-source";
import { TUNING } from "./config/tuning";
import { createDefaultFont } from "./domain/font/font";
import { AnswerPaginator } from "./domain/pages/answer-paginator";
import { Mulberry32 } from "./domain/random/mulberry32";
import { TextNormalizer } from "./domain/text/text-normalizer";
import { CanvasRenderer } from "./rendering/canvas-renderer";
import { MediaQueryMotionPreference } from "./rendering/motion-preference";
import { layoutStage } from "./rendering/stage-layout";
import type { StageLayout } from "./rendering/stage-layout";
import { AnimationLoop } from "./ui/animation-loop";
import { Conversation } from "./ui/conversation";
import { selectProfile } from "./ui/device-profile-selector";
import { PhaseIndicator } from "./ui/phase-indicator";
import { QuestionForm } from "./ui/question-form";
import { closesKeyboardAfterSending } from "./ui/on-screen-keyboard";
import { connectReplayButton } from "./ui/replay-button";
import { requireElement } from "./ui/required-element";
import { SpokenAnswer } from "./ui/spoken-answer";
import { Stage } from "./ui/stage";
import { StageSizeWatcher } from "./ui/stage-size-watcher";
import { readTestHooks } from "./ui/test-hooks";
import { readUrlParameters } from "./ui/url-parameters";

/** Längster Schritt der Animation je Bild: Nach einer Pause (Tab im Hintergrund) gibt es keinen Riesensprung. */
const LONGEST_FRAME_SECONDS = 0.1;

// Geräteprofil und Abstimmungswerte
const urlParameters = readUrlParameters(window.location.search);
const profile = selectProfile(window.innerWidth, urlParameters.profile);
const testHooks = readTestHooks(window);
const tuning = {
  ...TUNING[profile],
  ...(urlParameters.seed === undefined ? {} : { seed: urlParameters.seed }),
  ...testHooks?.tuning,
};

// Elemente der Seite
const stageElement = requireElement(document, "stage", HTMLElement);
const canvas = requireElement(document, "maze", HTMLCanvasElement);
const form = requireElement(document, "ask-form", HTMLFormElement);
const questionInput = requireElement(document, "question", HTMLInputElement);
const replayButton = requireElement(document, "replay", HTMLButtonElement);
const spokenRegion = requireElement(document, "spoken-answer", HTMLElement);

function createContext2d(target: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = target.getContext("2d");
  if (context === null) throw new Error("Der Browser kann nicht auf das Canvas zeichnen");
  return context;
}

function measureStage(): StageLayout {
  return layoutStage(
    { width: stageElement.clientWidth, height: stageElement.clientHeight },
    window.devicePixelRatio,
    tuning.maxPixelRatio,
    tuning.stageSizing,
  );
}

// Zeichnen
const renderer = new CanvasRenderer({
  canvas,
  context: createContext2d(canvas),
  createLayer: (width, height) => {
    const layer = document.createElement("canvas");
    layer.width = width;
    layer.height = height;
    return { context: createContext2d(layer), image: layer };
  },
  random: new Mulberry32(testHooks?.randomSeed ?? Math.floor(Math.random() * 2 ** 32)),
  motion: new MediaQueryMotionPreference(window.matchMedia("(prefers-reduced-motion: reduce)")),
  settings: tuning,
  layout: measureStage(),
});

// Bühne: Ablauf der Animation und Zeichnen
const font = createDefaultFont();
const normalizer = new TextNormalizer(font, (unknownCharacters) => {
  console.warn(
    "Zeichen ohne Glyphe, die Schrift schreibt dafür eine Ersatzglyphe:",
    unknownCharacters,
  );
});
const stage = new Stage({
  renderer,
  measure: measureStage,
  createPlayback: (layout, firstSeed) =>
    new AnswerPlayback(
      new AnswerPaginator(font, normalizer, (seed) => new Mulberry32(seed), {
        columns: layout.columns,
        rows: layout.rows,
        restingDistance: tuning.restingDistance,
        maze: tuning,
      }),
      { ...tuning, seed: firstSeed },
    ),
  baseSeed: tuning.seed,
  phaseDisplay: new PhaseIndicator(stageElement),
});

// Frage und Antwort
const conversation = new Conversation(
  new StaticContentAnswerSource(() => fetchJson("/content.json", fetch)),
  stage,
  new SpokenAnswer(spokenRegion),
);
new QuestionForm(form, questionInput, {
  blurAfterSending: closesKeyboardAfterSending(
    tuning.blurInputAfterSending,
    window.matchMedia("(pointer: coarse)").matches,
  ),
  scrollToTop: () => {
    window.scrollTo(0, 0);
  },
  onQuestion: (question) => {
    conversation.ask(question);
  },
});
connectReplayButton(replayButton, () => {
  conversation.replay();
});

// Größe der Bühne und Sichtbarkeit der Seite
const sizeWatcher = new StageSizeWatcher({
  stage: stageElement,
  builtFor: () => stage.builtFor,
  isTyping: () => document.activeElement === questionInput,
  rebuild: () => {
    stage.rebuild();
  },
  delay: (callback, millis) => {
    const timer = window.setTimeout(callback, millis);
    return () => {
      window.clearTimeout(timer);
    };
  },
});
window.addEventListener("resize", () => {
  sizeWatcher.notifyChange();
});
// Das Auf- und Zuklappen von Bedienelementen ändert die Bühne, ohne dass das Fenster sich ändert.
new ResizeObserver(() => {
  sizeWatcher.notifyChange();
}).observe(stageElement);

const loop = new AnimationLoop(
  stage,
  new FrameTimer(
    testHooks?.clock ?? new PerformanceClock(() => performance.now()),
    LONGEST_FRAME_SECONDS,
  ),
  testHooks?.requestFrame ??
    ((callback) => {
      requestAnimationFrame(callback);
    }),
);
document.addEventListener("visibilitychange", () => {
  loop.pageVisibilityChanged(document.visibilityState === "visible");
});
// Der Browser meldet hiermit, dass er den Zeichenzustand des Canvas verloren und neu angelegt hat.
canvas.addEventListener("contextrestored", () => {
  stage.refresh();
});

conversation.start();
loop.start();
