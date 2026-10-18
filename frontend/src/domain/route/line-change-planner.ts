import type { AreaPathFinder } from "./area-path-finder";
import type { RouteTrace } from "./route-trace";
import type { Rectangle } from "./text-block-layout";

/**
 * Plant den Zeilenwechsel: vom Ende einer Textzeile zurück nach links zum Anfang der nächsten.
 *
 * Der Rückweg windet sich durch das Band zwischen den beiden Textzeilen, statt schnurgerade nach
 * links zu laufen. Ein langer gerader Gang quer über die ganze Seite würde den Zeilenwechsel
 * (und damit den versteckten Text) sofort verraten. Die Zellen des Bands, die der Rückweg nicht
 * braucht, füllt später der `MazeGrower` mit gewöhnlichen Gängen.
 */
export class LineChangePlanner {
  public constructor(private readonly areaPathFinder: AreaPathFinder) {}

  /**
   * Hängt den Zeilenwechsel an die Route an. Die Route steht dabei auf der Grundlinie der
   * fertigen Zeile.
   *
   * @param band die äußersten Zellen des Bands
   * @param descentColumn die Spalte links neben der nächsten Zeile, in der es zu ihr hinuntergeht
   * @param nextBaselineRow die Grundlinie der nächsten Zeile
   * @param windiness wie stark sich der Rückweg im Band windet (0 bis 1)
   */
  public appendLineChange(
    trace: RouteTrace,
    band: Rectangle,
    descentColumn: number,
    nextBaselineRow: number,
    windiness: number,
  ): void {
    const lineEnd = trace.end;
    const isInBand = ({ x, y }: { x: number; y: number }): boolean =>
      x >= band.left && x <= band.right && y >= band.top && y <= band.bottom;

    const wayBack = this.areaPathFinder.find(
      isInBand,
      { x: lineEnd.x, y: band.top },
      { x: descentColumn, y: band.bottom },
      windiness,
    );
    wayBack.forEach((cell) => {
      trace.addStep(cell, "connector");
    });
    trace.walkTo(descentColumn, nextBaselineRow, "connector");
  }
}
