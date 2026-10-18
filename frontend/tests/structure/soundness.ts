// Gemeinsame Prüfung für die Strukturtests: Eine Seite ist in Ordnung, wenn ihre Route die
// Regeln einhält und der Leser genau den Text auf ihr wiederfindet.

import { expect } from "vitest";
import type { MazePage } from "../../src/domain/pages/maze-page-generator";
import { checkRoute } from "./route-checks";
import { readGlyphs } from "./route-reader";

/** Die Einstellungen des Handy-Profils, mit denen die Strukturtests arbeiten. */
export const SETTINGS = {
  windiness: 0.7,
  detour: 0.3,
  returnBandRows: 2,
  returnWindiness: 0.5,
  maxWallRun: 4,
};

/** Prüft eine Seite: Regeln der Route und dass der Leser genau den Text wiederfindet. */
export function expectPageIsSound(page: MazePage): void {
  expect(checkRoute(page, SETTINGS.returnBandRows)).toEqual([]);
  const read = readGlyphs(page, SETTINGS.returnBandRows);
  page.lines.forEach((line, lineIndex) => {
    Array.from(line).forEach((character, characterIndex) => {
      const candidates = read[lineIndex]?.[characterIndex] ?? "";
      const expected = character === " " ? " " : candidates;
      expect(
        candidates,
        `Zeile ${String(lineIndex)}, Zeichen ${String(characterIndex)}: ${character}`,
      ).toContain(character === " " ? expected : character);
    });
  });
}
