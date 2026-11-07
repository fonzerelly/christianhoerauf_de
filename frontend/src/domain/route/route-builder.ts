import type { Font } from "../font/font";
import { CHAR_ADVANCE, GLYPH_HEIGHT } from "../font/glyph";
import { widthInCharacters } from "../font/text-width";
import { itemAt } from "../lists";
import type { Position } from "../maze/position";
import type { Picture } from "../picture/picture";
import type { AreaPathFinder } from "./area-path-finder";
import { cellOutside } from "./gate";
import type { Gate } from "./gate";
import { appendGlyph } from "./glyph-route";
import type { LineChangePlanner } from "./line-change-planner";
import type { RouteStep } from "./route-step";
import { RouteTrace } from "./route-trace";
import { Territories } from "./territories";
import { lineAdvanceOf, lineLeftIn } from "./text-block-layout";
import type { Rectangle, TextAlignment, TextBlock } from "./text-block-layout";

/** Wie viele Zellen der Lichtpunkt vor dem Eingang startet und hinter dem Ausgang verschwindet. */
const STEPS_OUTSIDE = 2;

/**
 * So viele Zeilen unter einem Bild gehören noch zu ihm: In der untersten kommt der Lichtpunkt von
 * links heran und steigt senkrecht zum Anfang des Bilds hinauf; in der obersten geht er danach
 * nach rechts hinaus.
 */
export const ROWS_BELOW_PICTURE = 3;

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

/** Die Route um ein Foto: dazu, wo jede Runde um den Rahmen endet. */
export interface PhotoRoute extends BuiltRoute {
  /** Index des Wegstücks, auf dem die Runde endet, je Runde. */
  readonly lapEnds: readonly number[];
}

/**
 * Baut den kompletten Weg des Lichtpunkts über eine Labyrinth-Seite: von außerhalb durch den
 * Eingang, in Windungen zum Text, durch alle Glyphen, in Windungen zum Ausgang und hinaus.
 * Statt des Texts kann es auch ein Bild sein (`buildPicture`) oder ein Foto, das er umrundet
 * (`buildPhoto`).
 *
 * Die Route besteht aus drei Teilen:
 * 1. Anlauf: vom Eingang am Rand in Windungen bis links neben den Text
 * 2. Text: durch alle Glyphen (bzw. das Bild)
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
    alignment: TextAlignment = "center",
  ): BuiltRoute {
    const gateIn = { x: block.left - 2, y: block.top + GLYPH_HEIGHT };
    const gateOut = { x: block.right + 2, y: block.bottom };
    return this.assemble(block, columns, entrance, exit, gateIn, gateOut, (trace) => {
      this.appendTextRoute(trace, lines, block, alignment);
    });
  }

  /**
   * Wie `build`, aber statt des Texts zeichnet der Lichtpunkt ein Bild, dessen Feld mit der linken
   * oberen Zelle bei (`left`, `top`) liegt. Der Weg des Bilds muss in seiner untersten Zeile
   * beginnen und dort enden (wie bei einer Glyphe).
   *
   * Unter dem Bild liegen `ROWS_BELOW_PICTURE` Zeilen, die mit zum Bild gehören: In der untersten
   * läuft der Lichtpunkt vom Anlauf nach rechts bis unter den Anfang des Bilds und steigt senkrecht
   * hinauf, er kommt also von unten. Nach dem Bild geht er eine Zelle hinunter und in dieser Zeile
   * nach rechts zum Ablauf.
   */
  public buildPicture(
    picture: Picture,
    left: number,
    top: number,
    columns: number,
    entrance: Gate,
    exit: Gate,
  ): BuiltRoute {
    const start = itemAt(picture.glyph, 0);
    const startColumn = left + start.x;
    const leaveRow = top + start.y + 1;
    const block = {
      left,
      right: left + picture.width - 1,
      top,
      bottom: top + picture.height - 1 + ROWS_BELOW_PICTURE,
    };
    const gateIn = { x: block.left - 2, y: block.bottom };
    const gateOut = { x: block.right + 2, y: leaveRow };
    return this.assemble(block, columns, entrance, exit, gateIn, gateOut, (trace) => {
      trace.walkTo(startColumn, block.bottom, "connector");
      appendGlyph(trace, picture.glyph, left, top); // der erste Wegpunkt: senkrecht hinauf
      trace.markGlyphEnd();
      trace.walkTo(startColumn, leaveRow, "connector");
      trace.walkTo(gateOut.x, gateOut.y, "connector");
    });
  }

  /**
   * Wie `build`, aber statt eines Texts umrundet der Lichtpunkt ein Foto: `frame` ist der Ring von
   * Zellen direkt um das Foto. Der Lichtpunkt kommt von links in der untersten Zeile des Rahmens an
   * und läuft `laps`-mal herum (hinauf, nach rechts, hinunter, zurück nach links), mit Schriftwegen,
   * damit der Rahmen kräftig leuchtet. Danach läuft er unten am Rahmen entlang nach rechts zum Ablauf.
   *
   * Das Ende jeder Runde steht in `lapEnds`; das Ende der letzten zählt als Ende der letzten Glyphe
   * (für den Haltepunkt).
   */
  public buildPhoto(
    frame: Rectangle,
    laps: number,
    columns: number,
    entrance: Gate,
    exit: Gate,
  ): PhotoRoute {
    const gateIn = { x: frame.left - 2, y: frame.bottom };
    const gateOut = { x: frame.right + 2, y: frame.bottom };
    const lapEnds: number[] = [];
    const route = this.assemble(frame, columns, entrance, exit, gateIn, gateOut, (trace) => {
      trace.walkTo(frame.left, frame.bottom, "connector");
      for (let lap = 0; lap < laps; lap++) {
        trace.walkTo(frame.left, frame.top, "letter");
        trace.walkTo(frame.right, frame.top, "letter");
        trace.walkTo(frame.right, frame.bottom, "letter");
        trace.walkTo(frame.left, frame.bottom, "letter");
        lapEnds.push(trace.steps.length - 1);
      }
      trace.markGlyphEnd();
      trace.walkTo(gateOut.x, gateOut.y, "connector");
    });
    return { ...route, lapEnds };
  }

  /**
   * Für eine Antwort ohne Stichwort: Der Lichtpunkt zieht nur einen Pfad, in Windungen durch das
   * ganze Raster vom Eingang zum Ausgang, ohne Schrift. Das Ende (`lastGlyphEnd`) liegt am
   * Ausgang; danach geht der Lichtpunkt hinaus.
   */
  public buildPath(entrance: Gate, exit: Gate): BuiltRoute {
    const path = this.areaPathFinder.find(
      () => true,
      entrance.cell,
      exit.cell,
      this.settings.detour,
    );
    const trace = new RouteTrace();
    for (let distance = STEPS_OUTSIDE; distance >= 1; distance--) {
      trace.addStep(cellOutside(entrance, distance), "connector");
    }
    path.forEach((cell) => {
      trace.addStep(cell, "connector");
    });
    const atExit = trace.steps.length - 1;
    for (let distance = 1; distance <= STEPS_OUTSIDE; distance++) {
      trace.addStep(cellOutside(exit, distance), "connector");
    }
    return { steps: trace.steps, lastGlyphEnd: atExit };
  }

  /**
   * Setzt eine Route aus Außenschritten, Anlauf, Mitte, Ablauf und Außenschritten zusammen. Anlauf
   * und Ablauf suchen sich ihren Weg in ihren Revieren rund um `block`: der Anlauf vom Eingang zum
   * Tor `gateIn` links des Blocks, der Ablauf vom Tor `gateOut` rechts des Blocks zum Ausgang.
   * `appendMiddle` muss die Route von `gateIn` bis `gateOut` führen.
   */
  private assemble(
    block: Rectangle,
    columns: number,
    entrance: Gate,
    exit: Gate,
    gateIn: Position,
    gateOut: Position,
    appendMiddle: (trace: RouteTrace) => void,
  ): BuiltRoute {
    const territories = new Territories(block, columns, entrance, exit);

    // Die Reihenfolge der Zufallsziehungen ist festgelegt: Anlauf, Ablauf, dann die Mitte.
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
    appendMiddle(trace);
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
    block: TextBlock,
    alignment: TextAlignment,
  ): void {
    const { returnBandRows, returnWindiness } = this.settings;
    const lineAdvance = lineAdvanceOf(returnBandRows);
    const baselineRowOf = (lineIndex: number): number =>
      block.top + lineIndex * lineAdvance + GLYPH_HEIGHT;

    lines.forEach((line, lineIndex) => {
      const lineLeft = lineLeftIn(block, line, alignment);
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

      let glyphLeft = lineLeft;
      for (const character of line) {
        const glyph = this.font.glyphFor(character);
        if (glyph !== undefined) {
          // Leerzeichen haben keine Glyphe: die Leuchtspur läuft einfach weiter
          trace.walkTo(glyphLeft + itemAt(glyph, 0).x, baselineRow, "connector");
          appendGlyph(trace, glyph, glyphLeft, block.top + lineIndex * lineAdvance);
          trace.markGlyphEnd();
          trace.walkTo(trace.end.x, baselineRow, "connector");
        }
        glyphLeft += widthInCharacters(character) * CHAR_ADVANCE;
      }
    });

    trace.walkTo(block.right + 2, baselineRowOf(lines.length - 1), "connector");
  }
}
