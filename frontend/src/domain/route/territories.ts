import type { Position } from "../maze/position";
import type { Gate, Side } from "./gate";
import type { TextBlock } from "./text-block-layout";

/**
 * Teilt alle Zellen in drei Reviere, damit sich Anlauf, Text und Ablauf nie kreuzen.
 *
 * ```
 *   +-------------------+---------------+
 *   |  Anlauf           |      Ablauf   |   Streifen über dem Text, geteilt an der Trennspalte
 *   |      +---------------------+      |
 *   |      |       T E X T       |      |   links vom Text: Anlauf, rechts vom Text: Ablauf
 *   |      +---------------------+      |
 *   |  Anlauf                |  Ablauf  |   Streifen unter dem Text, geteilt an der Trennspalte
 *   +------------------------+----------+
 * ```
 *
 * Das Text-Revier ist der Textblock plus je eine Spalte Rand (für die Zeilenwechsel). Die
 * Bänder zwischen den Textzeilen liegen vollständig im Text-Revier. Beide äußeren Reviere
 * hängen in sich zusammen: das Anlauf-Revier über die Spalte ganz links, das Ablauf-Revier
 * über die Spalte ganz rechts. Deshalb gibt es in jedem immer einen Weg.
 */
export class Territories {
  private readonly dividingColumnAbove: number;
  private readonly dividingColumnBelow: number;

  public constructor(
    private readonly block: TextBlock,
    columns: number,
    entrance: Gate,
    exit: Gate,
  ) {
    this.dividingColumnAbove = this.dividingColumn("top", entrance, exit, columns);
    this.dividingColumnBelow = this.dividingColumn("bottom", entrance, exit, columns);
  }

  public isText({ x, y }: Position): boolean {
    return (
      x >= this.block.left - 1 &&
      x <= this.block.right + 1 &&
      y >= this.block.top &&
      y <= this.block.bottom
    );
  }

  public isApproach(cell: Position): boolean {
    return !this.isText(cell) && this.isLeftOfDivide(cell);
  }

  public isLeave(cell: Position): boolean {
    return !this.isText(cell) && !this.isLeftOfDivide(cell);
  }

  private isLeftOfDivide({ x, y }: Position): boolean {
    if (y < this.block.top) return x < this.dividingColumnAbove;
    if (y > this.block.bottom) return x < this.dividingColumnBelow;
    return x < this.block.left;
  }

  /**
   * Die Trennspalte im Streifen über (`top`) oder unter (`bottom`) dem Text: links von ihr
   * gehört der Streifen dem Anlauf, ab ihr dem Ablauf.
   *
   * Normalerweise ist das die Mitte. Liegt der Eingang an diesem Rand, weicht die Trennspalte
   * nach rechts aus, bis er im Anlauf-Revier liegt; liegt der Ausgang an diesem Rand, weicht
   * sie nach links aus. Beides zugleich geht, weil der Ausgang immer rechts vom Eingang liegt.
   */
  private dividingColumn(side: Side, entrance: Gate, exit: Gate, columns: number): number {
    let column = Math.floor(columns / 2);
    if (entrance.side === side) column = Math.max(column, entrance.cell.x + 1);
    if (exit.side === side) column = Math.min(column, exit.cell.x);
    return column;
  }
}
