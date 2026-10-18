import { RectangularGrid } from "../maze/rectangular-grid";
import type { Position } from "../maze/position";
import type { WindingPathFinder } from "../maze/winding-path-finder";

/** Erfindet gewundene Wege durch einen Teil des Rasters, zum Beispiel ein Revier. */
export class AreaPathFinder {
  public constructor(
    private readonly columns: number,
    private readonly rows: number,
    private readonly windingPathFinder: WindingPathFinder,
  ) {}

  /**
   * Ein gewundener Weg von `from` nach `to`, der nur über Stellen läuft, für die `isAllowed`
   * wahr ist. `windiness` (0 bis 1): nahe 0 eher direkt, nahe 1 lange Umwege.
   */
  public find(
    isAllowed: (position: Position) => boolean,
    from: Position,
    to: Position,
    windiness: number,
  ): Position[] {
    const scratch = new RectangularGrid(this.columns, this.rows);
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.columns; x++) {
        if (!isAllowed({ x, y })) scratch.touch(scratch.idOf(x, y)); // gilt damit als belegt
      }
    }

    const path = this.windingPathFinder.find(
      scratch,
      scratch.idOf(from.x, from.y),
      scratch.idOf(to.x, to.y),
      windiness,
    );
    return path.map((cell) => scratch.positionOf(cell));
  }
}
