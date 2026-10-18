import { itemAt } from "../lists";
import type { CellGraph, CellId } from "./cell-graph";
import type { Position } from "./position";

/**
 * Ein Labyrinth aus `columns` mal `rows` quadratischen Zellen. Die Zellen sind zeilenweise von
 * oben links durchnummeriert. Zwischen benachbarten Zellen steht eine Wand oder ein Durchgang.
 */
export class RectangularGrid implements CellGraph {
  /** Durchgang von der Zelle nach rechts. */
  private readonly openRight: boolean[];
  /** Durchgang von der Zelle nach unten. */
  private readonly openDown: boolean[];
  private readonly touched: boolean[];

  public constructor(
    public readonly columns: number,
    public readonly rows: number,
  ) {
    this.openRight = new Array<boolean>(columns * rows).fill(false);
    this.openDown = new Array<boolean>(columns * rows).fill(false);
    this.touched = new Array<boolean>(columns * rows).fill(false);
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
    return itemAt(this.openRight, this.idOf(x, y));
  }

  /** Ist die Wand unter der Zelle (x, y) offen? */
  public isOpenDown(x: number, y: number): boolean {
    return itemAt(this.openDown, this.idOf(x, y));
  }

  public neighboursOf(cell: CellId): readonly CellId[] {
    const { x, y } = this.positionOf(cell);
    const candidates: Position[] = [
      { x: x + 1, y },
      { x: x - 1, y },
      { x, y: y + 1 },
      { x, y: y - 1 },
    ];
    return candidates
      .filter((candidate) => this.contains(candidate.x, candidate.y))
      .map((candidate) => this.idOf(candidate.x, candidate.y));
  }

  public isConnected(first: CellId, second: CellId): boolean {
    const passage = this.passageBetween(first, second);
    return passage !== undefined && itemAt(passage.openings, passage.cell);
  }

  public connect(first: CellId, second: CellId): void {
    const passage = this.passageBetween(first, second);
    if (passage === undefined) {
      throw new RangeError(
        `Die Zellen ${String(first)} und ${String(second)} liegen nicht nebeneinander`,
      );
    }
    passage.openings[passage.cell] = true;
    this.touch(first);
    this.touch(second);
  }

  public isTouched(cell: CellId): boolean {
    return itemAt(this.touched, cell);
  }

  public touch(cell: CellId): void {
    this.touched[cell] = true;
  }

  public touchedCells(): readonly CellId[] {
    return this.touched.flatMap((isTouched, cell) => (isTouched ? [cell] : []));
  }

  /**
   * Zwischen zwei benachbarten Zellen: welche Liste von Durchgängen (rechts oder unten) und
   * welcher Eintrag darin sie beschreibt. Der Durchgang gehört der linken bzw. oberen Zelle.
   */
  private passageBetween(
    first: CellId,
    second: CellId,
  ): { openings: boolean[]; cell: CellId } | undefined {
    const from = this.positionOf(first);
    const to = this.positionOf(second);
    const dx = to.x - from.x;
    const dy = to.y - from.y;

    if (dy === 0 && dx === 1) return { openings: this.openRight, cell: first };
    if (dy === 0 && dx === -1) return { openings: this.openRight, cell: second };
    if (dx === 0 && dy === 1) return { openings: this.openDown, cell: first };
    if (dx === 0 && dy === -1) return { openings: this.openDown, cell: second };
    return undefined;
  }
}
