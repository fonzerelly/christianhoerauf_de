import type { MatchTermEntry } from "./match-term-matcher";

/** Der Inhalt von `content.json`: Standardantwort und die Suchwort-Tabelle. */
export interface Content {
  readonly unknownAnswer: string;
  readonly answers: readonly MatchTermEntry[];
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

function parseEntry(entry: unknown, index: number): MatchTermEntry {
  const path = `answers[${String(index)}]`;
  if (!isRecord(entry)) throw invalid(path, "ein Objekt");

  const matchTerms = entry.matchTerms;
  if (!Array.isArray(matchTerms) || !matchTerms.every((term) => typeof term === "string")) {
    throw invalid(`${path}.matchTerms`, "eine Liste von Texten");
  }
  const answer = textAt(entry, "answer", `${path}.answer`);
  const optional = (field: "keyword" | "gimmick") =>
    entry[field] === undefined ? {} : { [field]: textAt(entry, field, `${path}.${field}`) };
  return { matchTerms, answer, ...optional("keyword"), ...optional("gimmick") };
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
    unknownAnswer: textAt(json, "unknownAnswer", "unknownAnswer"),
    answers: answers.map((entry: unknown, index) => parseEntry(entry, index)),
  };
}
