import type { Cv, CvEntry } from "../domain/cv/stations";

/** Wo das Backend den Lebenslauf ausliefert, neben den Antworten (backend `handler.py`). */
const CV_PATH = "/lebenslauf";
/** Der ausgedachte Lebenslauf der Tests; der Dev-Server liefert ihn direkt aus dem Projekt. */
const TEST_CV_PATH = "/tests/fixtures/lebenslauf.json";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function invalid(what: string): Error {
  return new Error(`${CV_PATH}: ${what}`);
}

function textOrUndefined(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function readEntry(entry: unknown): CvEntry {
  if (!isRecord(entry) || typeof entry.titel !== "string") throw invalid("Eintrag ohne Titel");
  const points = entry.stichpunkte ?? [];
  if (!Array.isArray(points) || !points.every((point) => typeof point === "string")) {
    throw invalid("Stichpunkte müssen Texte sein");
  }
  const time = textOrUndefined(entry.zeit);
  const organization = textOrUndefined(entry.organisation);
  return {
    ...(time === undefined ? {} : { time }),
    title: entry.titel,
    ...(organization === undefined ? {} : { organization }),
    bulletPoints: points,
  };
}

/**
 * Übersetzt das JSON von `/lebenslauf` (deutsche Schlüssel, `backend/schema/lebenslauf.schema.json`)
 * in die Domäne: `abschnitte` → `sections`, `eintraege` → `entries`, `zeit`/`titel`/
 * `organisation`/`stichpunkte`. Projekte haben keinen Zeitraum und keine Stichpunkte; ihre
 * übrigen Felder (`link`, `text`) braucht die Zeitleiste nicht. Wirft, wenn etwas fehlt.
 */
export function readCv(json: unknown): Cv {
  if (!isRecord(json) || !Array.isArray(json.abschnitte)) throw invalid("keine Abschnitte");
  return {
    sections: json.abschnitte.map((section: unknown) => {
      if (!isRecord(section) || typeof section.name !== "string") {
        throw invalid("Abschnitt ohne Namen");
      }
      if (!Array.isArray(section.eintraege)) throw invalid("Abschnitt ohne Einträge");
      return { name: section.name, entries: section.eintraege.map(readEntry) };
    }),
  };
}

export interface HttpCvSourceSettings {
  /** Adresse von `/lebenslauf` (siehe `cvUrlOf`). */
  readonly url: string;
  /** Die Variante aus dem persönlichen Link; ohne kommt der ganze Lebenslauf. */
  readonly variant?: number | undefined;
  readonly fetchFunction: (
    url: string,
  ) => Promise<{ readonly ok: boolean; readonly status: number; json(): Promise<unknown> }>;
}

/**
 * Holt den Lebenslauf vom Backend (`GET /lebenslauf?variante=<Nummer>`, Q23); das Backend filtert
 * nach der Variante. Scheitert bei Netzfehler, Fehlerstatus oder unbrauchbarem Inhalt; die
 * Zeitleiste zeigt dann „Gerade nicht erreichbar“ (Q35).
 */
export class HttpCvSource {
  public constructor(private readonly settings: HttpCvSourceSettings) {}

  public async load(): Promise<Cv> {
    const { url, variant, fetchFunction } = this.settings;
    const address = variant === undefined ? url : `${url}?variante=${String(variant)}`;
    const response = await fetchFunction(address);
    if (!response.ok) throw invalid(`Status ${String(response.status)}`);
    return readCv(await response.json());
  }
}

/**
 * Die Adresse von `/lebenslauf`: beim Backend der Antworten (`answerUrl`, aus `VITE_ANSWER_URL`).
 * Im Dev-Server die eigene Herkunft, denn das Backend erlaubt nur christianhoerauf.de; Vite leitet
 * `/lebenslauf` dorthin weiter (`vite.config.ts`). Ohne Backend: `undefined`. Im Dev-Server auf
 * Wunsch (`?lebenslauf=test`, `wantsTestCv`) der ausgedachte Lebenslauf der Tests, auch ohne
 * Backend; außerhalb des Dev-Servers wird der Wunsch überhört.
 */
export function cvUrlOf(
  answerUrl: string | undefined,
  isDevServer: boolean,
  wantsTestCv = false,
): string | undefined {
  if (isDevServer && wantsTestCv) return TEST_CV_PATH;
  if (answerUrl === undefined || answerUrl === "") return undefined;
  return isDevServer ? CV_PATH : new URL(CV_PATH, answerUrl).toString();
}
