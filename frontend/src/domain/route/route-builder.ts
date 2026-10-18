import type { Font } from "../font/font";
import { CHAR_ADVANCE, GLYPH_HEIGHT } from "../font/glyph";
import { itemAt } from "../lists";
import type { AreaPathFinder } from "./area-path-finder";
import { cellOutside } from "./gate";
import type { Gate } from "./gate";
import { appendGlyph } from "./glyph-route";
import type { LineChangePlanner } from "./line-change-planner";
import type { RouteStep } from "./route-step";
import { RouteTrace } from "./route-trace";
import { Territories } from "./territories";
import { lineAdvanceOf, lineLeftOf } from "./text-block-layout";
import type { TextBlock } from "./text-block-layout";

/** Wie viele Zellen der Lichtpunkt vor dem Eingang startet und hinter dem Ausgang verschwindet. */
const STEPS_OUTSIDE = 2;

export interface RouteSettings {
  /** Umwege bei An- und Ablauf (0 bis 1). */
  readonly detour: number;
  /** Höhe des Zeilenwechsel-Bands. */
  readonly returnBandRows: number;
  /** Wie stark sich der Rückweg im Band windet (0 bis 1). */
  readonly returnWindiness: number;
}

export interface BuiltRoute {
  readonly steps: readonly RouteStep[];
  /** Index des Wegstücks, auf dem die letzte Glyphe endet. */
  readonly lastGlyphEnd: number;
}

/**
 * Baut den kompletten Weg des Lichtpunkts über eine Labyrinth-Seite: von außerhalb durch den
 * Eingang, in Windungen zum Text, durch alle Glyphen, in Windungen zum Ausgang und hinaus.
 *
 * Die Route besteht aus drei Teilen:
 * 1. Anlauf: vom Eingang am Rand in Windungen bis links neben den Text
 * 2. Text: durch alle Glyphen
 * 3. Ablauf: von rechts neben dem Text in Windungen zum Ausgang am Rand
 */
export class RouteBuilder {
  public constructor(
    private readonly font: Font,
    private readonly areaPathFinder: AreaPathFinder,
    private readonly lineChangePlanner: LineChangePlanner,
    private readonly settings: RouteSettings,
  ) {}

  public build(
    lines: readonly string[],
    block: TextBlock,
    columns: number,
    entrance: Gate,
    exit: Gate,
  ): BuiltRoute {
    const territories = new Territories(block, columns, entrance, exit);
    const gateIn = { x: block.left - 2, y: block.top + GLYPH_HEIGHT };
    const gateOut = { x: block.right + 2, y: block.bottom };

    // Die Reihenfolge der Zufallsziehungen ist festgelegt: Anlauf, Ablauf, dann der Text.
    const approach = this.areaPathFinder.find(
      (cell) => territories.isApproach(cell),
      entrance.cell,
      gateIn,
      this.settings.detour,
    );
    const leave = this.areaPathFinder.find(
      (cell) => territories.isLeave(cell),
      gateOut,
      exit.cell,
      this.settings.detour,
    );

    const trace = new RouteTrace();
    for (let distance = STEPS_OUTSIDE; distance >= 1; distance--) {
      trace.addStep(cellOutside(entrance, distance), "connector");
    }
    approach.forEach((cell) => {
      trace.addStep(cell, "connector");
    });
    this.appendTextRoute(trace, lines, columns, block);
    leave.slice(1).forEach((cell) => {
      trace.addStep(cell, "connector"); // das Tor selbst ist schon das Routenende
    });
    for (let distance = 1; distance <= STEPS_OUTSIDE; distance++) {
      trace.addStep(cellOutside(exit, distance), "connector");
    }

    const lastGlyphEnd = trace.lastGlyphEnd;
    if (lastGlyphEnd === undefined) throw new Error("Der Text enthält kein darstellbares Zeichen");
    return { steps: trace.steps, lastGlyphEnd };
  }

  /**
   * Hängt den Weg durch den ganzen Text an. Die Route muss am "Tor" links neben dem Text enden
   * und endet danach am Tor rechts neben dem Text.
   *
   * Aufbau einer Textzeile (von oben nach unten):
   * - 5 Zeilen Glyphen
   * - 1 Zeile Grundlinie: hier läuft der Lichtpunkt von Glyphe zu Glyphe
   * - Band für den Zeilenwechsel (`returnBandRows` Zeilen hoch): hier windet er sich nach links
   *   zurück zum Anfang der nächsten Textzeile
   */
  private appendTextRoute(
    trace: RouteTrace,
    lines: readonly string[],
    columns: number,
    block: TextBlock,
  ): void {
    const { returnBandRows, returnWindiness } = this.settings;
    const lineAdvance = lineAdvanceOf(returnBandRows);
    const baselineRowOf = (lineIndex: number): number =>
      block.top + lineIndex * lineAdvance + GLYPH_HEIGHT;

    lines.forEach((line, lineIndex) => {
      const lineLeft = lineLeftOf(line, columns);
      const baselineRow = baselineRowOf(lineIndex);

      if (lineIndex > 0) {
        const baselineAbove = baselineRowOf(lineIndex - 1);
        const band = {
          left: block.left - 1,
          right: block.right + 1,
          top: baselineAbove + 1,
          bottom: baselineAbove + returnBandRows,
        };
        this.lineChangePlanner.appendLineChange(
          trace,
          band,
          lineLeft - 1,
          baselineRow,
          returnWindiness,
        );
      }

      Array.from(line).forEach((character, characterIndex) => {
        const glyph = this.font.glyphFor(character);
        if (glyph === undefined) return; // Leerzeichen: die Leuchtspur läuft einfach weiter

        const glyphLeft = lineLeft + characterIndex * CHAR_ADVANCE;
        trace.walkTo(glyphLeft + itemAt(glyph, 0).x, baselineRow, "connector");
        appendGlyph(trace, glyph, glyphLeft, block.top + lineIndex * lineAdvance);
        trace.markGlyphEnd();
        trace.walkTo(trace.end.x, baselineRow, "connector");
      });
    });

    trace.walkTo(block.right + 2, baselineRowOf(lines.length - 1), "connector");
  }
}
