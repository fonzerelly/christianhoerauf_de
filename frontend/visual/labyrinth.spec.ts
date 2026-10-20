// Bildtests der ganzen Seite: Die Seite läuft im echten Browser (im Docker-Image von Playwright)
// mit einer Uhr, die nur auf Befehl weiterläuft, und festem Startwert für Flimmern und
// Bildstörung. So zeigt jedes Bild genau denselben Augenblick der Animation.
//
// Die Antworten liefert Playwright aus den Dateien unter `fixtures/` (statt `content.json`).
// Jede Begrüßung passt auf eine Labyrinth-Seite, außer in `mehrere-seiten`.

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

type Phase = "writing" | "resting" | "fading" | "scrolling" | "waiting";

/** Was der Init-Skript in der Seite bereitstellt (siehe `installTestHooks`). */
interface PageHooks {
  advance(seconds: number, step?: number): void;
}

/** Eine Leuchtspur, die nicht verglimmt: Am Haltepunkt steht dann der ganze Text lesbar da. */
const LASTING_TRAIL = { holdSeconds: 3600, fadeSeconds: 3600 };

/**
 * Eine Leuchtspur, die lange genug steht, dass eine ganze Seite lesbar bleibt, aber nach einer halben Minute
 * verglommen ist: So wartet die Animation nicht ewig, bis sie zur nächsten Seite weiterschiebt.
 */
const LONG_TRAIL = { holdSeconds: 25, fadeSeconds: 5 };

/** Längste Zeit in Sekunden, die auf einen Abschnitt gewartet wird. */
const LONGEST_WAIT_SECONDS = 180;

/** Läuft in der Seite, bevor ihre Skripte laufen: Uhr und Bildtakt, die nur der Test weiterstellt. */
function installTestHooks(tuning: Record<string, number>): void {
  let time = 0;
  let pendingFrame: (() => void) | undefined;
  (window as unknown as { labyrinthTestHooks: unknown }).labyrinthTestHooks = {
    clock: { now: () => time },
    requestFrame: (callback: () => void) => {
      pendingFrame = callback;
    },
    randomSeed: 2026,
    tuning,
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
async function open(
  page: Page,
  fixture: string,
  tuning: Record<string, number> = {},
): Promise<void> {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.addInitScript(installTestHooks, tuning);
  await page.route("**/content.json", (route) =>
    route.fulfill({ path: `visual/fixtures/${fixture}.json` }),
  );
  await page.goto("/");
  // Bilder anstoßen, bis die Begrüßung da ist: Sie kommt über das Netz, die Uhr steht still.
  await page.waitForFunction(() => {
    const hooks = (window as unknown as { labyrinthTestHooks: PageHooks }).labyrinthTestHooks;
    hooks.advance(0);
    return document.getElementById("stage")?.dataset.phase === "writing";
  });
  expect(errors).toEqual([]);
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

const SINGLE_PAGE_FIXTURES = ["zeichensatz-1", "zeichensatz-2", "ersatzglyphe"];

for (const fixture of SINGLE_PAGE_FIXTURES) {
  test.describe(fixture, () => {
    test("mitten im Schreiben", async ({ page }) => {
      await open(page, fixture);

      await advance(page, 3);

      await expect(page).toHaveScreenshot(`${fixture}-schreiben.png`);
    });

    test("am Haltepunkt, die Spur bleibt stehen", async ({ page }) => {
      await open(page, fixture, LASTING_TRAIL);

      await advanceUntil(page, "resting");
      await advance(page, 0.8);

      await expect(page).toHaveScreenshot(`${fixture}-haltepunkt.png`);
    });
  });
}

test.describe("mehrere-seiten", () => {
  test("mitten im Schreiben der ersten Seite", async ({ page }) => {
    await open(page, "mehrere-seiten");

    await advance(page, 3);

    await expect(page).toHaveScreenshot("mehrere-seiten-schreiben.png");
  });

  test("beim Weiterschieben zur zweiten Seite", async ({ page }) => {
    await open(page, "mehrere-seiten");

    await advanceUntil(page, "scrolling");
    await advance(page, 0.6);

    await expect(page).toHaveScreenshot("mehrere-seiten-weiterschieben.png");
  });

  test("am Haltepunkt der zweiten Seite, die Spur bleibt stehen", async ({ page }) => {
    test.setTimeout(90_000); // das Verglimmen der ersten Seite sind mehrere hundert Bilder
    await open(page, "mehrere-seiten", LONG_TRAIL);

    await advanceUntil(page, "resting");
    await advance(page, 0.8);

    await expect(page).toHaveScreenshot("mehrere-seiten-haltepunkt.png");
  });
});

test.describe("Frage und Antwort", () => {
  test("beim Weiterschieben nach einer Frage", async ({ page }) => {
    await open(page, "zeichensatz-1");
    await advanceUntil(page, "resting");

    await page.fill("#question", "Hallo!");
    await page.press("#question", "Enter");
    await advanceUntil(page, "scrolling");
    await advance(page, 0.6);

    await expect(page).toHaveScreenshot("frage-weiterschieben.png");
  });

  test("Nochmal schreibt die Antwort in einem frischen Labyrinth", async ({ page }) => {
    await open(page, "zeichensatz-1");
    await advanceUntil(page, "resting");

    await page.click("#replay");
    await advanceUntil(page, "scrolling");
    await advance(page, 0.6);

    await expect(page).toHaveScreenshot("nochmal-weiterschieben.png");
  });
});

test.describe("weniger Bewegung gewünscht", () => {
  test.use({ reducedMotion: "reduce" });

  test("der Lichtpunkt leuchtet am Haltepunkt ruhig, ohne Flimmern und Bildstörung", async ({
    page,
  }) => {
    await open(page, "zeichensatz-1", LASTING_TRAIL);

    await advanceUntil(page, "resting");
    await advance(page, 0.8);

    await expect(page).toHaveScreenshot("weniger-bewegung-haltepunkt.png");
  });
});
