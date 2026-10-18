import { itemAt } from "../lists";
import { pickOne, shuffle } from "../random/random-choices";
import type { RandomSource } from "../random/random-source";
import type { CellGraph, CellId } from "./cell-graph";

/**
 * Lässt Gänge in alle noch unberührten Zellen wachsen ("Growing Tree"-Algorithmus).
 *
 * Wiederholt wird eine schon erschlossene Zelle gewählt und von ihr aus ein Gang in eine noch
 * unberührte Nachbarzelle gebrochen. Weil nur in unberührte Zellen gegraben wird, entstehen
 * keine Rundwege und keine Abkürzungen.
 */
export class MazeGrower {
  public constructor(private readonly random: RandomSource) {}

  /**
   * Lässt von den Startzellen aus Gänge wachsen. Die Startzellen sollten schon berührt sein.
   *
   * `windiness` (0 bis 1) bestimmt den Charakter: nahe 1 wird meist die zuletzt erschlossene
   * Zelle weitergeführt (lange, gewundene Gänge), nahe 0 meist eine zufällige (viele kurze
   * Sackgassen).
   */
  public grow(graph: CellGraph, startCells: readonly CellId[], windiness: number): void {
    const active = shuffle([...startCells], this.random);

    while (active.length > 0) {
      const index = this.pickActiveIndex(active.length, windiness);
      const cell = itemAt(active, index);

      const freeNeighbours = graph
        .neighboursOf(cell)
        .filter((neighbour) => !graph.isTouched(neighbour));
      if (freeNeighbours.length === 0) {
        active.splice(index, 1);
        continue;
      }

      const next = pickOne(freeNeighbours, this.random);
      graph.connect(cell, next);
      active.push(next);
    }
  }

  private pickActiveIndex(activeCount: number, windiness: number): number {
    const takeNewest = this.random.next() < windiness;
    return takeNewest ? activeCount - 1 : Math.floor(this.random.next() * activeCount);
  }
}
