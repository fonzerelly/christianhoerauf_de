// Composition Root: steckt alle Teile der Seite zusammen und sonst nichts. Hier, und nur hier,
// werden die Adapter für Browser, Uhr, Zufall und Antwortquelle ausgewählt.
//
// Die Datei hat keine eigene Logik und steht deshalb nicht in der Unit-Test-Abdeckung (siehe
// vitest.config.ts); dass das Zusammenspiel funktioniert, zeigen die Bildtests.

import { AnswerPlayback } from "./animation/answer-playback";
import chrisPhotoUrl from "./assets/chris.jpg";
import { FrameTimer } from "./animation/frame-timer";
import { PerformanceClock } from "./animation/performance-clock";
import { fetchJson } from "./answering/fetch-json";
import type { AnswerSource } from "./answering/answer-source";
import { HttpAnswerSource } from "./answering/http-answer-source";
import { StaticContentAnswerSource } from "./answering/static-content-answer-source";
import { TUNING } from "./config/tuning";
import { createDefaultFont, REPLACEMENT_CHARACTER } from "./domain/font/font";
import { greetingKeyword, greetingParagraphs } from "./domain/greeting/greeting";
import { readPersonalLink, variantOf } from "./domain/greeting/personal-link";
import { cvUrlOf, HttpCvSource } from "./cv/http-cv-source";
import { AnswerPaginator } from "./domain/pages/answer-paginator";
import { Mulberry32 } from "./domain/random/mulberry32";
import { TextNormalizer } from "./domain/text/text-normalizer";
import { CanvasRenderer } from "./rendering/canvas-renderer";
import { MediaQueryMotionPreference } from "./rendering/motion-preference";
import { layoutStage } from "./rendering/stage-layout";
import type { StageLayout } from "./rendering/stage-layout";
import { AnimationLoop } from "./ui/animation-loop";
import { AnswerArea } from "./ui/answer-area";
import { Conversation } from "./ui/conversation";
import { selectProfile } from "./ui/device-profile-selector";
import { PhaseIndicator } from "./ui/phase-indicator";
import { PreparedPageSource } from "./ui/prepared-page-source";
import { QuestionForm } from "./ui/question-form";
import { closesKeyboardAfterSending } from "./ui/on-screen-keyboard";
import { requireElement } from "./ui/required-element";
import { Stage } from "./ui/stage";
import type { ScheduleTask } from "./ui/step-runner";
import { applyStageLayout } from "./ui/stage-frame";
import { StageSizeWatcher } from "./ui/stage-size-watcher";
import { ScrollControls } from "./ui/timeline/scroll-controls";
import { Timeline } from "./ui/timeline/timeline";
import { TimelineView } from "./ui/timeline/timeline-view";
import { yearOfDate } from "./ui/timeline/year-of-date";
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

// Der persönliche Link hinter „#“ (Schritt 12.2): Begrüßung und Variante des Lebenslaufs. Der Name
// bleibt im Browser.
const personalLink = readPersonalLink(window.location.hash);

// Elemente der Seite; das Profil steht am body, das Layout richtet sich danach (Ränder am Handy)
document.body.dataset.profile = profile;
const pageElement = requireElement(document, "page", HTMLElement);
const stageElement = requireElement(document, "stage", HTMLElement);
const timelineElement = requireElement(document, "timeline", HTMLElement);
const canvas = requireElement(document, "maze", HTMLCanvasElement);
const form = requireElement(document, "ask-form", HTMLFormElement);
const questionInput = requireElement(document, "question", HTMLInputElement);
const answerAreaElement = requireElement(document, "answer-area", HTMLElement);
const suggestionsElement = requireElement(document, "suggestions", HTMLElement);

function createContext2d(target: HTMLCanvasElement): CanvasRenderingContext2D {
  const context = target.getContext("2d");
  if (context === null) throw new Error("Der Browser kann nicht auf das Canvas zeichnen");
  return context;
}

/** Teilt die Bühne nach ihrer Breite ein und setzt danach ihre Höhe und die Breite des Labyrinths. */
function measureStage(): StageLayout {
  const layout = layoutStage(
    stageElement.clientWidth,
    window.devicePixelRatio,
    tuning.maxPixelRatio,
    tuning.stageSizing,
    tuning.stageRows,
  );
  applyStageLayout(stageElement, pageElement, layout);
  return layout;
}

// Zufall für Flimmern und Bildstörung; ein Test legt den Startwert fest
const randomSeed = testHooks?.randomSeed ?? Math.floor(Math.random() * 2 ** 32);

// Zeichnen. Eine vorab gezeichnete Fläche wird ausgeführt (`flush`), indem sie auf ein
// Ein-Pixel-Canvas kopiert wird: Der Browser muss dafür alles Aufgezeichnete rechnen, aber nichts
// vom Grafikspeicher zurücklesen (anders als bei `getImageData`).
const flushTarget = createContext2d(
  Object.assign(document.createElement("canvas"), { width: 1, height: 1 }),
);
// Das Foto für das Foto-Gimmick lädt der Browser gleich zu Beginn. Bis es da ist, bleibt das Feld
// unter dem Foto leer.
const chrisPhoto = Object.assign(new Image(), { src: chrisPhotoUrl });

// Weniger Bewegung gewünscht: kein Flimmern, keine Bildstörung, ein Durchlauf je Stichwort
const motion = new MediaQueryMotionPreference(
  window.matchMedia("(prefers-reduced-motion: reduce)"),
);
const renderer = new CanvasRenderer({
  canvas,
  context: createContext2d(canvas),
  createLayer: (width, height) => {
    const layer = document.createElement("canvas");
    layer.width = width;
    layer.height = height;
    return {
      context: createContext2d(layer),
      image: layer,
      flush: () => {
        flushTarget.drawImage(layer, 0, 0, 1, 1);
      },
    };
  },
  random: new Mulberry32(randomSeed),
  motion,
  settings: tuning,
  layout: measureStage(),
  photos: () => (chrisPhoto.complete && chrisPhoto.naturalWidth > 0 ? chrisPhoto : undefined),
});

// Bühne: Ablauf der Animation und Zeichnen. Die Seiten einer Antwort entstehen und werden vorab
// gezeichnet in lauter kleinen Aufgaben, damit der Browser dazwischen arbeiten kann.
const scheduleTask: ScheduleTask =
  testHooks?.scheduleTask ??
  ((task) => {
    window.setTimeout(task, 0);
  });
const font = createDefaultFont();
const normalizer = new TextNormalizer(font, (unknownCharacters) => {
  console.warn(
    "Zeichen ohne Glyphe, die Schrift schreibt dafür eine Ersatzglyphe:",
    unknownCharacters,
  );
});
const stage = new Stage({
  renderer,
  scheduleTask,
  measure: measureStage,
  createPlayback: (layout, firstSeed) =>
    new AnswerPlayback(
      new PreparedPageSource(
        new AnswerPaginator(font, normalizer, (seed) => new Mulberry32(seed), {
          columns: layout.columns,
          rows: layout.rows,
          restingDistance: tuning.restingDistance,
          maze: tuning,
        }),
        renderer,
        scheduleTask,
      ),
      { ...tuning, seed: firstSeed },
      motion,
    ),
  baseSeed: tuning.seed,
  phaseDisplay: new PhaseIndicator(stageElement),
});

// Antwortquelle (ADR 0003): Ohne Adresse des Backends antwortet die statische Datei; mit Adresse
// (beim Bauen aus VITE_ANSWER_URL) fragt die Seite das Backend. Die Begrüßung baut die Seite selbst.
const ANSWER_TIMEOUT_MILLIS = 15_000;
const staticAnswers = new StaticContentAnswerSource(() => fetchJson("content.json", fetch));
const answerUrl = import.meta.env.VITE_ANSWER_URL;
const answerSource: AnswerSource =
  answerUrl === undefined || answerUrl === ""
    ? staticAnswers
    : new HttpAnswerSource({
        url: answerUrl,
        // Als eigene Funktion: `fetch` muss mit `window` als `this` laufen, sonst „Illegal invocation“.
        fetchFunction: (url, init) => fetch(url, init),
        timeoutMillis: ANSWER_TIMEOUT_MILLIS,
        timeoutSignal: (millis) => AbortSignal.timeout(millis),
      });

// Frage und Antwort
const answerArea = new AnswerArea({
  document,
  area: answerAreaElement,
  suggestions: suggestionsElement,
  questionInput,
  areaTop: () => answerAreaElement.getBoundingClientRect().top,
  viewportHeight: () => window.innerHeight,
  scrollToArea: () => {
    answerAreaElement.scrollIntoView({
      behavior: motion.isReduced ? "auto" : "smooth",
      block: "start",
    });
  },
});
const conversation = new Conversation(answerSource, stage, answerArea);
new QuestionForm(form, questionInput, {
  blurAfterSending: closesKeyboardAfterSending(
    tuning.blurInputAfterSending,
    window.matchMedia("(pointer: coarse)").matches,
  ),
  onQuestion: (question) => {
    conversation.ask(question);
    // Wer fragt, braucht Platz für die Antwort (Q43).
    timeline?.collapse();
  },
});

// Größe der Bühne und Sichtbarkeit der Seite
const sizeWatcher = new StageSizeWatcher({
  stage: stageElement,
  builtFor: () => stage.builtFor,
  rebuild: () => {
    stage.rebuild();
    timeline?.refresh();
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
// Eine Bildlaufleiste, die erscheint oder verschwindet, ändert die Breite, ohne dass das Fenster sich ändert.
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
  const isVisible = document.visibilityState === "visible";
  loop.pageVisibilityChanged(isVisible);
});
// Der Browser meldet hiermit, dass er den Zeichenzustand des Canvas verloren und neu angelegt hat.
canvas.addEventListener("contextrestored", () => {
  stage.refresh();
});

// Die Zeitleiste mit den Stationen aus /lebenslauf, der Variante aus dem persönlichen Link (Q23).
// Ohne Backend gibt es keine; ihr Platz bleibt versteckt.
const cvUrl = testHooks?.cvUrl ?? cvUrlOf(answerUrl, import.meta.env.DEV);
const today = testHooks?.today ?? yearOfDate(new Date());
const timeline =
  cvUrl === undefined
    ? undefined
    : new Timeline(
        new HttpCvSource({
          url: cvUrl,
          variant: variantOf(personalLink),
          fetchFunction: (url) => fetch(url),
        }),
        new TimelineView({
          document,
          container: timelineElement,
          measureWidth: (element) => element.offsetWidth,
          measureHeight: (element) => element.offsetHeight,
          visibleWidth: (element) => element.clientWidth,
          scrollWidth: (element) => element.scrollWidth,
          minPixelsPerYear: tuning.timelineMinPixelsPerYear,
          today,
          connectScrolling: (elements) => {
            new ScrollControls({ ...elements, prefersReducedMotion: () => motion.isReduced });
          },
        }),
        today,
      );
timeline?.load();

conversation.start({
  text: greetingParagraphs(personalLink).join("\n\n"),
  keyword: greetingKeyword(personalLink, {
    withHello: profile === "desktop",
    canWrite: (text) => !normalizer.normalize(text).includes(REPLACEMENT_CHARACTER),
  }),
});
loop.start();
