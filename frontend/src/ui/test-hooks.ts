import type { Clock } from "../animation/clock";
import type { Tuning } from "../config/tuning";

/**
 * Was ein Test der Seite vor dem Laden mitgeben kann, um sie wiederholbar zu machen: eine Uhr,
 * die nur auf Befehl läuft, einen Bildtakt, der nur auf Befehl ein Bild liefert, und einen festen
 * Startwert für Flimmern und Bildstörung. Besucher können das nicht setzen (es ist kein
 * Adress-Parameter); Playwright legt es mit `addInitScript` als `window.labyrinthTestHooks` ab.
 */
export interface TestHooks {
  readonly clock: Clock;
  readonly requestFrame: (callback: () => void) => void;
  readonly randomSeed: number;
  /** Abstimmungswerte, die den Wert des Geräteprofils ersetzen (leer, wenn der Test keine ersetzen will). */
  readonly tuning: Partial<Tuning>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Liest die Bereitstellung des Tests aus dem globalen Bereich der Seite; `undefined`, wenn keine (oder eine unvollständige) da ist. */
export function readTestHooks(scope: object): TestHooks | undefined {
  const hooks = (scope as { labyrinthTestHooks?: unknown }).labyrinthTestHooks;
  if (!isRecord(hooks)) return undefined;

  const { clock, requestFrame, randomSeed, tuning = {} } = hooks;
  const hasClock = isRecord(clock) && typeof clock.now === "function";
  if (
    !hasClock ||
    typeof requestFrame !== "function" ||
    typeof randomSeed !== "number" ||
    !isRecord(tuning)
  ) {
    return undefined;
  }
  return {
    tuning,
    clock: clock as unknown as Clock,
    requestFrame: requestFrame as TestHooks["requestFrame"],
    randomSeed,
  };
}
