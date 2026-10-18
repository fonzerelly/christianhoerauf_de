import type { CellGraph, CellId } from "./cell-graph";
import type { MazeGrower } from "./maze-grower";
import type { PathFinder } from "./path-finder";

/**
 * Erfindet einen gewundenen Weg zwischen zwei Zellen.
 *
 * Trick: In einem Wegwerf-Labyrinth gibt es zwischen zwei Zellen genau einen Weg, und der sieht
 * von selbst nach Labyrinth aus.
 */
export class WindingPathFinder {
  public constructor(
    private readonly grower: MazeGrower,
    private readonly pathFinder: PathFinder,
  ) {}

  /**
   * Lässt im Wegwerf-Labyrinth `scratch` ab `from` Gänge wachsen und liefert den Weg nach `to`.
   * Zellen, die in `scratch` schon berührt sind, gelten als belegt; der Weg meidet sie.
   * `windiness` (0 bis 1): nahe 0 eher direkt, nahe 1 lange Umwege.
   */
  public find(scratch: CellGraph, from: CellId, to: CellId, windiness: number): CellId[] {
    scratch.touch(from);
    this.grower.grow(scratch, [from], windiness);
    return this.pathFinder.find(scratch, from, to);
  }
}
