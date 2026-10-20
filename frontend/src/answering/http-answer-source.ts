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
  readonly fetchFunction: HttpFetch;
  /** Beantwortet die leere Frage (Begrüßung); das Backend wird dafür nicht gefragt. */
  readonly greetingSource: AnswerSource;
  readonly timeoutMillis: number;
  /** Liefert ein Signal, das nach so vielen Millisekunden abbricht (im Browser `AbortSignal.timeout`). */
  readonly timeoutSignal: (millis: number) => AbortSignal;
}

const STATUS_BAD_REQUEST = 400;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readGimmick(value: unknown): Gimmick | undefined {
  if (!isRecord(value) || typeof value.type !== "string") return undefined;
  return { ...value, type: value.type };
}

/** Macht aus dem JSON der Antwort eine `Answer`; `undefined`, wenn der Text fehlt oder leer ist. */
function readAnswer(body: unknown): Answer | undefined {
  if (!isRecord(body) || typeof body.text !== "string" || body.text.trim() === "") {
    return undefined;
  }
  const gimmick = readGimmick(body.gimmick);
  return gimmick === undefined ? { text: body.text } : { text: body.text, gimmick };
}

/**
 * Fragt das Backend per `POST` mit `{"question": "..."}` und liest `{"text": ..., "gimmick"?: ...}`.
 * Bei Status 400 gilt der Text der Antwort (das Backend sagt, was an der Frage nicht stimmt). Bei
 * Netzfehler, Zeitüberschreitung, anderem Status oder ungültiger Antwort gilt `UNREACHABLE_ANSWER`.
 * Die Begrüßung (leere Frage) kommt aus `greetingSource`.
 */
export class HttpAnswerSource implements AnswerSource {
  public constructor(private readonly settings: HttpAnswerSourceSettings) {}

  public async answer(question: string): Promise<Answer> {
    if (question === "") return this.settings.greetingSource.answer(question);
    try {
      return (await this.ask(question)) ?? { text: UNREACHABLE_ANSWER };
    } catch {
      return { text: UNREACHABLE_ANSWER };
    }
  }

  private async ask(question: string): Promise<Answer | undefined> {
    const response = await this.settings.fetchFunction(this.settings.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question }),
      signal: this.settings.timeoutSignal(this.settings.timeoutMillis),
    });
    if (!response.ok && response.status !== STATUS_BAD_REQUEST) return undefined;
    return readAnswer(await response.json());
  }
}
