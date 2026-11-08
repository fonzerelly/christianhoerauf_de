// Bildtests der ganzen Seite: Die Seite läuft im echten Browser (im Docker-Image von Playwright)
// mit einer Uhr, die nur auf Befehl weiterläuft, und festem Startwert für Flimmern und
// Bildstörung. So zeigt jedes Bild genau denselben Augenblick der Animation.
//
// Die Antworten liefert Playwright aus den Dateien unter `fixtures/` (statt `content.json`), den
// Lebenslauf für die Zeitleiste aus `tests/fixtures/lebenslauf.json` (ausgedacht). Die
// Begrüßung baut die Seite selbst (ohne persönlichen Link: „HALLO“). Die Tests fragen „zeige“; die
// Antwort darauf hat ein Stichwort, das auf eine Labyrinth-Seite passt (höchstens 10 Zeichen, so
// viele wie am Handy in eine Zeile passen), außer in `mehrere-seiten`.

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

type Phase = "writing" | "resting" | "fading" | "scrolling" | "waiting";

/** Was der Init-Skript in der Seite bereitstellt (siehe `installTestHooks`). */
interface PageHooks {
  advance(seconds: number, step?: number): void;
}

/**
 * Ein Durchlauf statt zwei: Der Lichtpunkt steht dann schneller am Haltepunkt. Die Schrift bleibt
 * dort stehen (seit Schritt 12.6), die Verbindungswege verglimmen wie sonst auch.
 */
const ONE_RUN = { keywordRuns: 1 };

/**
 * Eine Leuchtspur, die lange genug steht, dass eine ganze Seite lesbar bleibt, aber nach einer halben Minute
 * verglommen ist: So wartet die Animation nicht ewig, bis sie zur nächsten Seite weiterschiebt.
 */
const LONG_TRAIL = { holdSeconds: 25, fadeSeconds: 5, keywordRuns: 1 };

/** Längste Zeit in Sekunden, die auf einen Abschnitt gewartet wird. */
const LONGEST_WAIT_SECONDS = 180;

/** Was ein Test außer der Antwort-Datei vorgeben kann. */
interface OpenOptions {
  /** Abstimmungswerte, die die des Geräteprofils ersetzen. */
  readonly tuning?: Record<string, number>;
  /** Liefert der Lebenslauf einen Fehler (503) statt der ausgedachten Datei? */
  readonly cvFails?: boolean;
  /** Antworten wie vom Backend (`HttpAnswerSource`), mit diesem Status, statt aus der Datei. */
  readonly answerStatus?: number;
}

/** Wohin die Seite ihre Fragen schickt, wenn der Test Antworten wie vom Backend will. */
const TEST_ANSWER_URL = "test-antwort";

/** Läuft in der Seite, bevor ihre Skripte laufen: Uhr und Bildtakt, die nur der Test weiterstellt, und Aufgaben ohne Verzögerung. */
function installTestHooks({
  tuning,
  answerUrl,
}: {
  tuning: Record<string, number>;
  answerUrl: string | undefined;
}): void {
  let time = 0;
  let pendingFrame: (() => void) | undefined;
  (window as unknown as { labyrinthTestHooks: unknown }).labyrinthTestHooks = {
    clock: { now: () => time },
    requestFrame: (callback: () => void) => {
      pendingFrame = callback;
    },
    // Die Seiten einer Antwort entstehen sonst in lauter kleinen Aufgaben; der Test führt sie sofort aus.
    scheduleTask: (task: () => void) => {
      task();
    },
    randomSeed: 2026,
    tuning,
    // Der ausgedachte Lebenslauf (tests/fixtures/lebenslauf.json) und ein festes „heute“: So hängt
    // die Zeitleiste weder vom Backend noch vom Datum ab.
    cvUrl: "test-lebenslauf.json",
    today: 2026.5,
    ...(answerUrl === undefined ? {} : { answerUrl }),
    /** Stellt die Uhr um `seconds` weiter, in Bildern zu höchstens `step` Sekunden. */
    advance: (seconds: number, step = 0.05) => {
      let left = seconds;
      do {
        const slice = Math.min(step, left);
        time += slice;
        left -= slice;
        const frame = pendingFrame;
        pendingFrame = undefined;
        frame?.();
      } while (left > 1e-9);
    },
  };
}

/** Öffnet die Seite mit der Begrüßung aus der Datei und wartet, bis der Lichtpunkt zu schreiben beginnt. */
async function open(page: Page, fixture: string, options: OpenOptions = {}): Promise<void> {
  const { tuning = {}, cvFails = false, answerStatus } = options;
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  const answerUrl = answerStatus === undefined ? undefined : TEST_ANSWER_URL;
  await page.addInitScript(installTestHooks, { tuning, answerUrl });
  await page.route("**/content.json", (route) =>
    route.fulfill({ path: `visual/fixtures/${fixture}.json` }),
  );
  await page.route("**/test-lebenslauf.json", (route) =>
    cvFails
      ? route.fulfill({ status: 503 })
      : route.fulfill({ path: "tests/fixtures/lebenslauf.json" }),
  );
  if (answerStatus !== undefined) {
    await page.route(`**/${TEST_ANSWER_URL}`, (route) => route.fulfill({ status: answerStatus }));
  }
  await page.goto("/");
  // Bilder anstoßen, bis die Begrüßung da ist: Sie kommt über das Netz, die Uhr steht still.
  await page.waitForFunction(() => {
    const hooks = (window as unknown as { labyrinthTestHooks: PageHooks }).labyrinthTestHooks;
    hooks.advance(0);
    return document.getElementById("stage")?.dataset.phase === "writing";
  });
  // Ein Fehler, den der Test selbst bestellt hat, meldet der Browser auch in der Konsole.
  const ordered = (error: string) => cvFails && error.includes("503");
  expect(errors.filter((error) => !ordered(error))).toEqual([]);
}

/** Stellt die Uhr der Seite um `seconds` weiter. */
async function advance(page: Page, seconds: number): Promise<void> {
  await page.evaluate((amount) => {
    (window as unknown as { labyrinthTestHooks: PageHooks }).labyrinthTestHooks.advance(amount);
  }, seconds);
}

/** Stellt die Uhr in kleinen Schritten weiter, bis die Animation im Abschnitt ist. */
async function advanceUntil(page: Page, phase: Phase): Promise<void> {
  const reached = await page.evaluate(
    ({ wanted, longest }) => {
      const hooks = (window as unknown as { labyrinthTestHooks: PageHooks }).labyrinthTestHooks;
      const stage = document.getElementById("stage");
      for (let elapsed = 0; elapsed < longest; elapsed += 0.1) {
        if (stage?.dataset.phase === wanted) return true;
        hooks.advance(0.1, 0.1);
      }
      return stage?.dataset.phase === wanted;
    },
    { wanted: phase, longest: LONGEST_WAIT_SECONDS },
  );
  expect(reached, `Abschnitt ${phase} wurde nicht erreicht`).toBe(true);
}

/**
 * Stellt die Frage (sonst „zeige“) und wartet, bis der Lichtpunkt die Antwort zu schreiben
 * beginnt (nach dem Weiterschieben von der Begrüßung).
 *
 * Gefragt wird erst, wenn die Begrüßung am Haltepunkt steht. Bis die Antwort über das Netz da ist,
 * steht die Uhr still (Bilder ohne Zeit); `waitForFunction` lässt dem Browser zwischen zwei
 * Prüfungen Luft dafür. So ist jedes Bild unabhängig davon, wie schnell die Antwort kommt.
 */
async function askToShow(page: Page, question = "zeige"): Promise<void> {
  await ask(page, question);
  await advanceUntil(page, "scrolling");
  await advanceUntil(page, "writing");
}

/**
 * Wartet, bis der Lichtpunkt am Haltepunkt steht, stellt die Frage und wartet bei stehender Uhr,
 * bis die Antwort da ist (der Lichtpunkt läuft dann weiter).
 */
async function ask(page: Page, question: string): Promise<void> {
  await advanceUntil(page, "resting");
  await page.fill("#question", question);
  await page.press("#question", "Enter");
  await page.waitForFunction(() => {
    const hooks = (window as unknown as { labyrinthTestHooks: PageHooks }).labyrinthTestHooks;
    hooks.advance(0);
    return document.getElementById("stage")?.dataset.phase !== "resting";
  });
}

/** Der Zeichensatz in Stücken zu höchstens 10 Zeichen, dazu die Ersatzglyphe. */
const SINGLE_PAGE_FIXTURES = [
  "zeichensatz-1",
  "zeichensatz-2",
  "zeichensatz-3",
  "zeichensatz-4",
  "ersatzglyphe",
];

for (const fixture of SINGLE_PAGE_FIXTURES) {
  test.describe(fixture, () => {
    test("mitten im Schreiben", async ({ page }) => {
      await open(page, fixture);
      await askToShow(page);

      await advance(page, 1);

      await expect(page).toHaveScreenshot(`${fixture}-schreiben.png`);
    });

    test("am Haltepunkt, die Spur bleibt stehen", async ({ page }) => {
      await open(page, fixture, { tuning: ONE_RUN });
      await askToShow(page);

      await advanceUntil(page, "resting");
      await advance(page, 0.8);

      await expect(page).toHaveScreenshot(`${fixture}-haltepunkt.png`);
    });
  });
}

test.describe("mehrere-seiten", () => {
  test("mitten im Schreiben der ersten Seite", async ({ page }) => {
    await open(page, "mehrere-seiten");
    await askToShow(page);

    await advance(page, 1);

    await expect(page).toHaveScreenshot("mehrere-seiten-schreiben.png");
  });

  test("beim Weiterschieben zur zweiten Seite", async ({ page }) => {
    await open(page, "mehrere-seiten");
    await askToShow(page);

    await advanceUntil(page, "scrolling");
    await advance(page, 0.6);

    await expect(page).toHaveScreenshot("mehrere-seiten-weiterschieben.png");
  });

  test("am Haltepunkt der zweiten Seite, die Spur bleibt stehen", async ({ page }) => {
    test.setTimeout(90_000); // das Verglimmen der ersten Seite sind mehrere hundert Bilder
    await open(page, "mehrere-seiten", { tuning: LONG_TRAIL });
    await askToShow(page);

    await advanceUntil(page, "resting");
    await advance(page, 0.8);

    await expect(page).toHaveScreenshot("mehrere-seiten-haltepunkt.png");
  });
});

/**
 * Die Gimmicks aus `fixtures/gimmicks.json`. Das Herz passt ins Raster der Bühne; der Smiley braucht
 * 22 Reihen und bekommt ein feineres Raster (Desktop 15, Handy 18 Reihen); das Foto braucht 10.
 */
const GIMMICKS = [
  { question: "herz", name: "herz" },
  { question: "smiley", name: "smiley" },
  { question: "foto", name: "foto" },
];

test.describe("Gimmicks", () => {
  for (const { question, name } of GIMMICKS) {
    test(`${name}: fertig gezeichnet, der Lichtpunkt am Haltepunkt`, async ({ page }) => {
      await open(page, "gimmicks", { tuning: LONG_TRAIL });
      await askToShow(page, question);

      await advanceUntil(page, "resting");
      await advance(page, 0.8);

      await expect(page).toHaveScreenshot(`${name}-haltepunkt.png`);
    });
  }

  test("beim Weiterschieben vom Smiley (feineres Raster) zum Herz (Raster der Bühne)", async ({
    page,
  }) => {
    test.setTimeout(90_000); // das Verglimmen des Smileys sind mehrere hundert Bilder
    await open(page, "gimmicks", { tuning: LONG_TRAIL });
    await askToShow(page, "smiley");

    await ask(page, "herz");
    await advanceUntil(page, "scrolling");
    await advance(page, 0.6);

    await expect(page).toHaveScreenshot("smiley-zum-herz-weiterschieben.png");
  });
});

test.describe("Abschluss (Schritt 12.14)", () => {
  test("Begrüßung, die Zeitleiste aufgeklappt", async ({ page }) => {
    await open(page, "zeichensatz-1");

    await advance(page, 1);

    await expect(page).toHaveScreenshot("begruessung-aufgeklappt.png");
  });

  test("der Lebenslauf ist nicht erreichbar", async ({ page }) => {
    await open(page, "zeichensatz-1", { cvFails: true });
    await expect(page.getByText("Die Stationen sind gerade nicht erreichbar.")).toBeVisible();

    await advance(page, 1);

    await expect(page).toHaveScreenshot("lebenslauf-nicht-erreichbar.png");
  });

  test("das Backend antwortet mit 503: der Lichtpunkt schreibt den Status", async ({ page }) => {
    await open(page, "zeichensatz-1", { answerStatus: 503, tuning: ONE_RUN });
    await askToShow(page);

    await advanceUntil(page, "resting");
    await advance(page, 0.8);

    await expect(page).toHaveScreenshot("fehler-503.png");
  });
});

test.describe("Frage und Antwort", () => {
  test("beim Weiterschieben nach einer Frage", async ({ page }) => {
    await open(page, "zeichensatz-1");

    await ask(page, "Hallo!");
    await advanceUntil(page, "scrolling");
    await advance(page, 0.6);

    await expect(page).toHaveScreenshot("frage-weiterschieben.png");
  });
});

test.describe("Stationsmenü", () => {
  test("offen unter einer Station; eine Wahl steht danach im Fragefeld, die Zeitleiste ist zu", async ({
    page,
  }) => {
    await open(page, "zeichensatz-1");
    await page.locator(".timeline-station-button").last().click();

    await expect(page.locator("#station-menu")).toBeVisible();
    await expect(page).toHaveScreenshot("stationsmenue-offen.png");

    await page.locator(".station-menu-question").nth(1).click();
    await expect(page.locator("#question")).toHaveValue(
      "Erzähl mir mehr über „Datenstrecke mit Kafka“ bei Beispiel AG.",
    );
    await expect(page.locator(".timeline-frame")).toHaveClass(/collapsed/);
    await expect(page.locator("#station-menu")).toBeHidden();
  });
});

test.describe("Bildstörung", () => {
  test("mitten in einer Bildstörung", async ({ page }) => {
    // 100.000 Störungen pro Minute: Es läuft vom ersten Bild an eine, der Störbalken ist nach 0,25 s im Bild.
    await open(page, "zeichensatz-1", { tuning: { glitchesPerMinute: 100_000 } });

    await advance(page, 0.25);

    await expect(page).toHaveScreenshot("bildstoerung.png");
  });
});

test.describe("weniger Bewegung gewünscht", () => {
  test.use({ reducedMotion: "reduce" });

  test("der Lichtpunkt leuchtet am Haltepunkt ruhig, ohne Flimmern und Bildstörung", async ({
    page,
  }) => {
    await open(page, "zeichensatz-1", { tuning: ONE_RUN });
    await askToShow(page);

    await advanceUntil(page, "resting");
    await advance(page, 0.8);

    await expect(page).toHaveScreenshot("weniger-bewegung-haltepunkt.png");
  });
});
