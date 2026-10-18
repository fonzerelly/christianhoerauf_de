import type { Glyph } from "../font/glyph";
import type { RouteTrace } from "./route-trace";
import type { StepKind } from "./route-step";

/**
 * Hängt den Weg durch eine Glyphe an. Die Route steht dabei auf der Grundlinie genau unter dem
 * ersten Wegpunkt. `left` und `top` sind die linke obere Zelle des Glyphen-Felds.
 *
 * Wegstücke gelten als
 * - Verbindungsweg: der Aufstieg von der Grundlinie zum ersten Wegpunkt,
 * - Sprung ohne Leuchtspur: der Weg zu einem Punkt oder Sprung-Wegpunkt und der Weg von einem
 *   Punkt weg,
 * - Schriftweg: alles andere.
 */
export function appendGlyph(trace: RouteTrace, glyph: Glyph, left: number, top: number): void {
  glyph.forEach((waypoint, index) => {
    const leadsToDot = waypoint.marker === "dot";
    const comesFromDot = glyph[index - 1]?.marker === "dot";

    let kind: StepKind = "letter";
    if (index === 0) kind = "connector";
    if (leadsToDot || comesFromDot || waypoint.marker === "hop") kind = "silent";

    trace.walkTo(left + waypoint.x, top + waypoint.y, kind);
    if (leadsToDot) trace.markEndAsDot();
  });
}
