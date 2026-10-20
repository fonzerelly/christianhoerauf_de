import { describe, expect, it } from "vitest";
import { HttpAnswerSource, UNREACHABLE_ANSWER } from "./http-answer-source";
import type { HttpFetch, HttpRequest } from "./http-answer-source";
import type { AnswerSource } from "./answer-source";

const URL = "https://example.test/ask";

/** Die Begrüßungsquelle: antwortet auf jede Frage mit "BEGRÜSSUNG" und zählt mit. */
function greetingSource() {
  const questions: string[] = [];
  const source: AnswerSource = {
    answer: (question) => {
      questions.push(question);
      return Promise.resolve({ text: "BEGRÜSSUNG" });
    },
  };
  return { source, questions };
}

/** Eine Antwort des Servers mit Status und JSON-Inhalt. */
function respond(status: number, body: unknown) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
  });
}

/** Eine Quelle mit der Netz-Attrappe `fetchFunction`; `requests` sammelt, was geschickt wurde. */
function build(
  fetchFunction: HttpFetch,
  timeoutSignal: (millis: number) => AbortSignal = () => new AbortController().signal,
) {
  const greeting = greetingSource();
  const source = new HttpAnswerSource({
    url: URL,
    fetchFunction,
    greetingSource: greeting.source,
    timeoutMillis: 15000,
    timeoutSignal,
  });
  return { source, greeting };
}

describe("HttpAnswerSource", () => {
  it("hat als feste Antwort den vereinbarten Satz", () => {
    expect(UNREACHABLE_ANSWER).toBe(
      "Ich bin gerade nicht erreichbar. Versuch es gleich noch einmal.",
    );
  });

  it("schickt die Frage als JSON per POST an die Adresse", async () => {
    const requests: { url: string; request: HttpRequest }[] = [];
    const { source } = build((url, request) => {
      requests.push({ url, request });
      return respond(200, { text: "ANTWORT" });
    });

    await source.answer("Wie spät ist es?");

    expect(requests).toHaveLength(1);
    expect(requests[0]?.url).toBe(URL);
    expect(requests[0]?.request.method).toBe("POST");
    expect(requests[0]?.request.headers).toEqual({ "Content-Type": "application/json" });
    expect(requests[0]?.request.body).toBe('{"question":"Wie spät ist es?"}');
  });

  it("liefert den Text der Antwort", async () => {
    const { source } = build(() => respond(200, { text: "ANTWORT" }));

    await expect(source.answer("Hallo?")).resolves.toEqual({ text: "ANTWORT" });
  });

  it("liefert ein Gimmick mit, wenn die Antwort eines hat", async () => {
    const gimmick = { type: "weather", temperature: 14 };
    const { source } = build(() => respond(200, { text: "14 Grad", gimmick }));

    await expect(source.answer("Wetter?")).resolves.toEqual({ text: "14 Grad", gimmick });
  });

  it.each([
    ["kein Objekt", 5],
    ["Gimmick ohne Typ", { type: 1 }],
    ["null", null],
  ])(
    "lässt ein unbrauchbares Gimmick weg (%s) und schreibt nur den Text",
    async (_name, gimmick) => {
      const { source } = build(() => respond(200, { text: "ANTWORT", gimmick }));

      await expect(source.answer("Hallo?")).resolves.toEqual({ text: "ANTWORT" });
    },
  );

  it("beantwortet die leere Frage aus der Begrüßungsquelle, ohne das Netz zu fragen", async () => {
    let calls = 0;
    const { source, greeting } = build(() => {
      calls++;
      return respond(200, { text: "ANTWORT" });
    });

    await expect(source.answer("")).resolves.toEqual({ text: "BEGRÜSSUNG" });
    expect(greeting.questions).toEqual([""]);
    expect(calls).toBe(0);
  });

  it("zeigt bei Status 400 den Text der Antwort", async () => {
    const { source } = build(() => respond(400, { text: "Das war zu lang." }));

    await expect(source.answer("x")).resolves.toEqual({ text: "Das war zu lang." });
  });

  it.each([
    ["Status 500", () => respond(500, { text: "Fehler" })],
    ["Status 403", () => respond(403, { text: "Nein" })],
    ["Netzfehler", () => Promise.reject(new Error("offline"))],
    [
      "kein JSON",
      () => Promise.resolve({ ok: true, status: 200, json: () => Promise.reject(new Error("x")) }),
    ],
    ["Antwort ohne Objekt", () => respond(200, "Text")],
    ["Antwort ohne text", () => respond(200, { gimmick: { type: "a" } })],
    ["text ist kein Text", () => respond(200, { text: 5 })],
    ["text ist leer", () => respond(200, { text: " " })],
    ["400 ohne text", () => respond(400, {})],
  ])("antwortet fest, dass es nicht erreichbar ist: %s", async (_name, result) => {
    const { source } = build(result);

    await expect(source.answer("Hallo?")).resolves.toEqual({ text: UNREACHABLE_ANSWER });
  });

  it("bricht nach der Zeitüberschreitung ab und antwortet fest", async () => {
    const timeout = new AbortController();
    const millisAsked: number[] = [];
    const { source } = build(
      (_url, request) =>
        new Promise((_resolve, reject) => {
          request.signal.addEventListener("abort", () => {
            reject(new Error("abgebrochen"));
          });
        }),
      (millis) => {
        millisAsked.push(millis);
        return timeout.signal;
      },
    );

    const answer = source.answer("Hallo?");
    timeout.abort();

    await expect(answer).resolves.toEqual({ text: UNREACHABLE_ANSWER });
    expect(millisAsked).toEqual([15000]);
  });
});
