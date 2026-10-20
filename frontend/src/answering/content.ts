import type { KeywordEntry } from "./keyword-matcher";

/** Der Inhalt von `content.json`: Begrüßung, Standardantwort und die Stichwort-Tabelle. */
export interface Content {
  readonly greeting: string;
  readonly unknownAnswer: string;
  readonly answers: readonly KeywordEntry[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function invalid(path: string, expected: string): Error {
  return new Error(`content.json: ${path} muss ${expected} sein`);
}

function textAt(record: Record<string, unknown>, field: string, path: string): string {
  const value = record[field];
  if (typeof value !== "string") throw invalid(path, "ein Text");
  return value;
}

function parseEntry(entry: unknown, index: number): KeywordEntry {
  const path = `answers[${String(index)}]`;
  if (!isRecord(entry)) throw invalid(path, "ein Objekt");

  const keywords = entry.keywords;
  if (!Array.isArray(keywords) || !keywords.every((keyword) => typeof keyword === "string")) {
    throw invalid(`${path}.keywords`, "eine Liste von Texten");
  }
  return { keywords: keywords, answer: textAt(entry, "answer", `${path}.answer`) };
}

/**
 * Prüft den Inhalt von `content.json` und macht daraus einen `Content`. Wirft einen Fehler mit
 * dem Namen des Felds, wenn etwas fehlt oder die falsche Form hat. Unbekannte Felder werden
 * ignoriert.
 */
export function parseContent(json: unknown): Content {
  if (!isRecord(json)) throw invalid("Der Inhalt", "ein Objekt");

  const answers = json.answers;
  if (!Array.isArray(answers)) throw invalid("answers", "eine Liste");

  return {
    greeting: textAt(json, "greeting", "greeting"),
    unknownAnswer: textAt(json, "unknownAnswer", "unknownAnswer"),
    answers: answers.map((entry: unknown, index) => parseEntry(entry, index)),
  };
}
