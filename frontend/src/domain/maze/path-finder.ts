import type { CellGraph, CellId } from "./cell-graph";

/** Sucht den kürzesten Weg durch die offenen Gänge eines Labyrinths (Breitensuche). */
export class PathFinder {
  /** Die Zellen von `from` bis `to`, beide eingeschlossen. Wirft, wenn es keinen Weg gibt. */
  public find(graph: CellGraph, from: CellId, to: CellId): CellId[] {
    const cameFrom = new Map<CellId, CellId | null>([[from, null]]);
    const queue = [from];

    for (const cell of queue) {
      if (cameFrom.has(to)) break;
      for (const neighbour of graph.neighboursOf(cell)) {
        if (cameFrom.has(neighbour) || !graph.isConnected(cell, neighbour)) continue;
        cameFrom.set(neighbour, cell);
        queue.push(neighbour);
      }
    }

    if (!cameFrom.has(to)) {
      throw new Error(`Kein Weg von Zelle ${String(from)} zu Zelle ${String(to)}`);
    }
    return this.walkBack(cameFrom, to);
  }

  private walkBack(cameFrom: ReadonlyMap<CellId, CellId | null>, to: CellId): CellId[] {
    const path: CellId[] = [];
    for (
      let cell: CellId | null | undefined = to;
      cell !== null && cell !== undefined;
      cell = cameFrom.get(cell)
    ) {
      path.push(cell);
    }
    return path.reverse();
  }
}
