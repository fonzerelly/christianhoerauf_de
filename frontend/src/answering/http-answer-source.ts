import type { Answer, Gimmick } from "./answer";
import type { AnswerSource } from "./answer-source";

/** Die feste Antwort, wenn das Backend nicht zu erreichen ist oder Unbrauchbares liefert. */
export const UNREACHABLE_ANSWER = "Ich bin gerade nicht erreichbar. Versuch es gleich noch einmal.";

/** Die Anfrage, die `HttpAnswerSource` abschickt. Ein Ausschnitt dessen, was `fetch` annimmt. */
export interface HttpRequest {
  readonly method: string;
  readonly headers: Record<string, string>;
  readonly body: string;
  readonly signal: AbortSignal;
}

/** Der Teil von `fetch`, den `HttpAnswerSource` braucht. */
export type HttpFetch = (
  url: string,
  request: HttpRequest,
) => Promise<{ readonly ok: boolean; readonly status: number; json(): Promise<unknown> }>;

export interface HttpAnswerSourceSettings {
  /** Adresse des Backends. */
  readonly url: string;
  /** Gesprächs-ID (Backend-ADR 0005): einmal je Seitenaufruf erzeugt, mit jeder Frage geschickt. */
  readonly conversation: string;
  readonly fetchFunction: HttpFetch;
  readonly timeoutMillis: number;
  /** Liefert ein Signal, das nach so vielen Millisekunden abbricht (im Browser `AbortSignal.timeout`). */
  readonly timeoutSignal: (millis: number) => AbortSignal;
}

const STATUS_BAD_REQUEST = 400;
/** So lang darf ein Stichwort höchstens sein (`backend/schema/answer.schema.json`). */
const LONGEST_KEYWORD = 24;
/** So viele Folgefragen höchstens, je so lang höchstens (Schema). */
const MOST_SUGGESTIONS = 3;
const LONGEST_SUGGESTION = 300;

/** Die Stichwörter, wenn das Backend nicht antworten kann (Q27, Q35); sonst der HTTP-Code. */
export const OFFLINE_KEYWORD = "OFFLINE";
export const TIMEOUT_KEYWORD = "TIMEOUT";
export const BROKEN_ANSWER_KEYWORD = "FEHLER";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readGimmick(value: unknown): Gimmick | undefined {
  if (!isRecord(value) || typeof value.type !== "string") return undefined;
  return { ...value, type: value.type };
}

function readKeyword(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const keyword = value.trim();
  return keyword !== "" && keyword.length <= LONGEST_KEYWORD ? keyword : undefined;
}

/** Die gültigen Folgefragen, höchstens drei; `undefined`, wenn keine bleibt. */
function readSuggestions(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const suggestions = value
    .filter((item): item is string => typeof item === "string")
    .filter((item) => item.trim() !== "" && item.length <= LONGEST_SUGGESTION)
    .slice(0, MOST_SUGGESTIONS);
  return suggestions.length > 0 ? suggestions : undefined;
}

/**
 * Macht aus dem JSON der Antwort eine `Answer`; `undefined`, wenn der Text fehlt oder leer ist.
 * Ein ungültiges Gimmick, Stichwort oder ungültige Folgefragen fallen weg, die Antwort bleibt.
 */
function readAnswer(body: unknown): Answer | undefined {
  if (!isRecord(body) || typeof body.text !== "string" || body.text.trim() === "") {
    return undefined;
  }
  const gimmick = readGimmick(body.gimmick);
  const keyword = readKeyword(body.keyword);
  const suggestions = readSuggestions(body.suggestions);
  return {
    text: body.text,
    ...(gimmick === undefined ? {} : { gimmick }),
    ...(keyword === undefined ? {} : { keyword }),
    ...(suggestions === undefined ? {} : { suggestions }),
  };
}

/** Die feste Antwort mit dem Stichwort, das sagt, was los ist. */
function unreachable(keyword: string): Answer {
  return { text: UNREACHABLE_ANSWER, keyword };
}

/**
 * Fragt das Backend per `POST` mit `{"question": "...", "conversation": "..."}` und liest `{"text", "gimmick"?,
 * "keyword"?, "suggestions"?}`. Bei Status 400 gilt der Text der Antwort (das Backend sagt, was an
 * der Frage nicht stimmt). Sonst gilt bei einem Fehler `UNREACHABLE_ANSWER` mit einem Stichwort:
 * dem HTTP-Code bei anderem Status, `TIMEOUT` nach der Zeitüberschreitung, `OFFLINE` ohne
 * Verbindung (auch CORS), `FEHLER` bei unbrauchbarer Antwort.
 */
export class HttpAnswerSource implements AnswerSource {
  public constructor(private readonly settings: HttpAnswerSourceSettings) {}

  public async answer(question: string): Promise<Answer> {
    const signal = this.settings.timeoutSignal(this.settings.timeoutMillis);
    let response: Awaited<ReturnType<HttpFetch>>;
    try {
      response = await this.settings.fetchFunction(this.settings.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, conversation: this.settings.conversation }),
        signal,
      });
    } catch {
      return unreachable(signal.aborted ? TIMEOUT_KEYWORD : OFFLINE_KEYWORD);
    }

    const status = String(response.status);
    if (!response.ok && response.status !== STATUS_BAD_REQUEST) return unreachable(status);
    try {
      const answer = readAnswer(await response.json());
      if (answer !== undefined) return answer;
    } catch {
      // kein JSON: wie eine unbrauchbare Antwort
    }
    return unreachable(response.ok ? BROKEN_ANSWER_KEYWORD : status);
  }
}
