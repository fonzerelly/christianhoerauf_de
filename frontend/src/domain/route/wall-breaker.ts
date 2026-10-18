import { integerBetween } from "../random/random-choices";
import type { RectangularGrid } from "../maze/rectangular-grid";
import type { RandomSource } from "../random/random-source";
import { GLYPH_HEIGHT } from "../font/glyph";
import type { RouteStep } from "./route-step";
import { lineAdvanceOf } from "./text-block-layout";
import type { TextBlock } from "./text-block-layout";

export interface WallBreakSettings {
  /** Längstes gerades Wandstück unter Grundlinie und Rückweg in Zellen; 0 schaltet es ab. */
  readonly maxWallRun: number;
  readonly returnBandRows: number;
}

/**
 * Unterbricht lange gerade Wände unter den Grundlinien und entlang der Rückwege.
 *
 * Die Grundlinie läuft unter einer Textzeile schnurgerade von Glyphe zu Glyphe. Ihre untere Wand
 * wäre deshalb eine durchgehende Linie über die ganze Zeile, und genau solche Linien verraten,
 * wo Text steht. Deshalb bekommt diese Wand nach jeweils wenigen Zellen eine Lücke; die Länge
 * der Stücke wird gewürfelt (höchstens `maxWallRun`). Dasselbe gilt für die waagrechten Wände im
 * Band, an denen der Rückweg entlangläuft.
 *
 * Liegt hinter der Lücke eine noch unberührte Zelle, entsteht dort einfach ein Abzweig. Liegt
 * dort ein anderes Stück der Route (z. B. der Rückweg), entsteht ein Rundweg im Labyrinth. Das
 * ist in Kauf genommen: Der Lichtpunkt läuft ohnehin seine feste Route, und Glyphen wie O oder A
 * bilden schon selbst Rundwege.
 */
export class WallBreaker {
  public constructor(
    private readonly random: RandomSource,
    private readonly settings: WallBreakSettings,
  ) {}

  /**
   * Muss vor dem Wachsen des Labyrinths laufen: Bis dahin sind genau die Zellen der Route
   * erschlossen.
   */
  public breakUpLongWalls(
    grid: RectangularGrid,
    route: readonly RouteStep[],
    lineCount: number,
    block: TextBlock,
  ): void {
    const { maxWallRun } = this.settings;
    if (maxWallRun === 0) return; // abgeschaltet: Wände bleiben durchgehend

    const routeCells = new Set(
      route
        .filter((step) => grid.contains(step.x, step.y))
        .map((step) => grid.idOf(step.x, step.y)),
    );
    const pickRunLength = (): number =>
      integerBetween(Math.ceil(maxWallRun / 2), maxWallRun, this.random);

    for (const y of this.rowsOfBaselinesAndBands(lineCount, block)) {
      let runLength = 0;
      let allowedRunLength = pickRunLength();

      for (let x = block.left - 1; x <= block.right + 1; x++) {
        // Geprüft wird die Wand UNTER der Zeile. Sie zählt, wenn auf einer Seite die Route verläuft.
        const touchesRoute = routeCells.has(grid.idOf(x, y)) || routeCells.has(grid.idOf(x, y + 1));
        const isWallAlongRoute = touchesRoute && !grid.isOpenDown(x, y);
        runLength = isWallAlongRoute ? runLength + 1 : 0;

        if (runLength > allowedRunLength) {
          grid.connect(grid.idOf(x, y), grid.idOf(x, y + 1));
          runLength = 0;
          allowedRunLength = pickRunLength();
        }
      }
    }
  }

  /**
   * Die Rasterzeilen, in denen der Lichtpunkt lange Strecken waagrecht läuft: unter jeder
   * Textzeile die Grundlinie und, außer unter der letzten, das Band für den Zeilenwechsel.
   */
  private rowsOfBaselinesAndBands(lineCount: number, block: TextBlock): number[] {
    const { returnBandRows } = this.settings;
    const rows: number[] = [];
    for (let lineIndex = 0; lineIndex < lineCount; lineIndex++) {
      const baselineRow = block.top + lineIndex * lineAdvanceOf(returnBandRows) + GLYPH_HEIGHT;
      const isLastLine = lineIndex === lineCount - 1;
      const bandRowsBelow = isLastLine ? 0 : returnBandRows;
      for (let offset = 0; offset <= bandRowsBelow; offset++) rows.push(baselineRow + offset);
    }
    return rows;
  }
}
