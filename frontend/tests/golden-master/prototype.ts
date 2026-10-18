// Lädt Schrift und Labyrinth des Prototyps (prototyp/06-frage-antwort) für den Vergleich
// mit dem Neubau (Golden Master).
//
// Die Skripte des Prototyps sind keine Module, sondern schlichte <script>-Dateien. Sie laufen
// hier nacheinander in einem eigenen vm-Kontext, so wie der Browser sie lädt.
//
// Ergebnisse kommen als JSON aus dem Kontext heraus. So sind es gewöhnliche Objekte dieses
// Prozesses und lassen sich mit toEqual vergleichen.

/* eslint-disable @typescript-eslint/no-unnecessary-type-parameters --
   Der Ergebnistyp ist eine Zusicherung des Aufrufers: Der Prototyp ist ungetypt, die Tests
   sagen, welche Form sie erwarten. */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createContext, runInContext } from "node:vm";

const PROTOTYPE_DIR = join(import.meta.dirname, "..", "..", "..", "prototyp", "06-frage-antwort");
const SCRIPTS = ["schrift.js", "labyrinth.js"];

export interface Prototype {
  /** Führt Code im Kontext des Prototyps aus und liefert das Ergebnis als JSON-Kopie. */
  evaluate<Result>(code: string): Result;

  /** Ruft eine Funktion des Prototyps auf. Die Argumente reisen als JSON hinein. */
  call<Result>(functionName: string, ...args: unknown[]): Result;
}

export function loadPrototype(): Prototype {
  const context = createContext({});
  for (const fileName of SCRIPTS) {
    const code = readFileSync(join(PROTOTYPE_DIR, fileName), "utf8");
    runInContext(code, context, { filename: fileName });
  }
  const prototype: Prototype = {
    evaluate<Result>(code: string): Result {
      const json = runInContext(`JSON.stringify(${code})`, context) as string;
      return JSON.parse(json) as Result;
    },
    call<Result>(functionName: string, ...args: unknown[]): Result {
      const argumentList = args.map((arg) => JSON.stringify(arg)).join(", ");
      return prototype.evaluate<Result>(`${functionName}(${argumentList})`);
    },
  };
  return prototype;
}
