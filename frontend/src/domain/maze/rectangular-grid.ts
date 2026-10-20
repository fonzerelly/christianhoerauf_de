import type { CellGraph, CellId } from "./cell-graph";
import type { Position } from "./position";

/** Ist das Flag an der Stelle gesetzt? Wirft, wenn es die Stelle nicht gibt (wie `itemAt`). */
function isSet(flags: Uint8Array, index: number): boolean {
  if (index < 0 || index >= flags.length) {
    throw new RangeError(
      `Stelle ${String(index)} liegt nicht in einer Liste der Länge ${String(flags.length)}`,
    );
  }
  return flags[index] === 1;
}

/**
 * Ein Labyrinth aus `columns` mal `rows` quadratischen Zellen. Die Zellen sind zeilenweise von
 * oben links durchnummeriert. Zwischen benachbarten Zellen steht eine Wand oder ein Durchgang.
 */
export class RectangularGrid implements CellGraph {
  // Die Flags liegen in Uint8Array statt in Array<boolean>: Das Raster wird oft angelegt (jede
  // Wegsuche braucht ein Wegwerf-Labyrinth) und ist dann sofort mit Nullen gefüllt.
  /** Durchgang von der Zelle nach rechts (1) oder Wand (0). */
  private readonly openRight: Uint8Array;
  /** Durchgang von der Zelle nach unten (1) oder Wand (0). */
  private readonly openDown: Uint8Array;
  private readonly touched: Uint8Array;

  public constructor(
    public readonly columns: number,
    public readonly rows: number,
  ) {
    this.openRight = new Uint8Array(columns * rows);
    this.openDown = new Uint8Array(columns * rows);
    this.touched = new Uint8Array(columns * rows);
  }

  public contains(x: number, y: number): boolean {
    return x >= 0 && x < this.columns && y >= 0 && y < this.rows;
  }

  public idOf(x: number, y: number): CellId {
    if (!this.contains(x, y)) {
      throw new RangeError(`Die Stelle (${String(x)}, ${String(y)}) liegt nicht im Raster`);
    }
    return y * this.columns + x;
  }

  public positionOf(cell: CellId): Position {
    return { x: cell % this.columns, y: Math.floor(cell / this.columns) };
  }

  /** Ist die Wand rechts neben der Zelle (x, y) offen? */
  public isOpenRight(x: number, y: number): boolean {
    return isSet(this.openRight, this.idOf(x, y));
  }

  /** Ist die Wand unter der Zelle (x, y) offen? */
  public isOpenDown(x: number, y: number): boolean {
    return isSet(this.openDown, this.idOf(x, y));
  }

  public neighboursOf(cell: CellId): readonly CellId[] {
    const x = cell % this.columns;
    const neighbours: CellId[] = [];
    if (x + 1 < this.columns) neighbours.push(cell + 1);
    if (x > 0) neighbours.push(cell - 1);
    if (cell + this.columns < this.columns * this.rows) neighbours.push(cell + this.columns);
    if (cell >= this.columns) neighbours.push(cell - this.columns);
    return neighbours;
  }

  public isConnected(first: CellId, second: CellId): boolean {
    const passage = this.passageBetween(first, second);
    return passage !== undefined && isSet(passage.openings, passage.cell);
  }

  public connect(first: CellId, second: CellId): void {
    const passage = this.passageBetween(first, second);
    if (passage === undefined) {
      throw new RangeError(
        `Die Zellen ${String(first)} und ${String(second)} liegen nicht nebeneinander`,
      );
    }
    passage.openings[passage.cell] = 1;
    this.touch(first);
    this.touch(second);
  }

  public isTouched(cell: CellId): boolean {
    return isSet(this.touched, cell);
  }

  public touch(cell: CellId): void {
    this.touched[cell] = 1;
  }

  public touchedCells(): readonly CellId[] {
    const cells: CellId[] = [];
    this.touched.forEach((isTouched, cell) => {
      if (isTouched === 1) cells.push(cell);
    });
    return cells;
  }

  /**
   * Zwischen zwei benachbarten Zellen: welche Liste von Durchgängen (rechts oder unten) und
   * welcher Eintrag darin sie beschreibt. Der Durchgang gehört der linken bzw. oberen Zelle.
   */
  private passageBetween(
    first: CellId,
    second: CellId,
  ): { openings: Uint8Array; cell: CellId } | undefined {
    // Gerechnet wird mit den Nummern statt mit Stellen: `connect` läuft für jede Zelle des
    // Rasters, und Stellen als Objekte anzulegen wäre dort der größte Posten.
    const difference = second - first;
    if (difference === 1 && first % this.columns < this.columns - 1) {
      return { openings: this.openRight, cell: first };
    }
    if (difference === -1 && second % this.columns < this.columns - 1) {
      return { openings: this.openRight, cell: second };
    }
    if (difference === this.columns) return { openings: this.openDown, cell: first };
    if (difference === -this.columns) return { openings: this.openDown, cell: second };
    return undefined;
  }
}
