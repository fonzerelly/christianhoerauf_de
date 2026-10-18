import { integerBetween, pickOne } from "../random/random-choices";
import type { Position } from "../maze/position";
import type { RandomSource } from "../random/random-source";
import type { Gate, Side } from "./gate";

interface ColumnRange {
  readonly min: number;
  readonly max: number;
}

/** Wählt Eingang und Ausgang einer Labyrinth-Seite per Zufall. */
export class BorderCellPicker {
  public constructor(private readonly random: RandomSource) {}

  /** Der Eingang der allerersten Seite: links, oben oder unten (oben/unten in der linken Hälfte). */
  public pickFirstEntrance(columns: number, rows: number): Gate {
    const side = pickOne<Side>(["left", "top", "bottom"], this.random);
    const leftHalf = { min: 1, max: Math.floor(columns / 2) - 1 };
    return { cell: this.pickBorderCell(side, columns, rows, leftHalf), side };
  }

  /**
   * Wählt Rand und Zelle des Ausgangs: rechts, oben oder unten. Ein Rand, an dem wegen des
   * Eingangs kein Platz ist, wird übergangen; rechts geht immer.
   */
  public pickExit(entrance: Gate, columns: number, rows: number): Gate {
    const hasRoom = (side: Side): boolean => {
      const range = this.exitColumnRange(side, entrance, columns);
      return side === "right" || range.min <= range.max;
    };
    const side = pickOne(
      (["right", "top", "bottom"] satisfies Side[]).filter(hasRoom),
      this.random,
    );
    return {
      cell: this.pickBorderCell(side, columns, rows, this.exitColumnRange(side, entrance, columns)),
      side,
    };
  }

  /**
   * Wählt eine Zelle am gewünschten Rand; bei oben/unten nur innerhalb des Spaltenbereichs.
   * Spalte und Zeile werden immer beide gezogen, auch wenn eine davon ungenutzt bleibt: Nur
   * so folgen alle weiteren Zufallszahlen derselben Reihenfolge wie im Prototyp.
   */
  private pickBorderCell(
    side: Side,
    columns: number,
    rows: number,
    columnRange: ColumnRange,
  ): Position {
    const column = integerBetween(columnRange.min, columnRange.max, this.random);
    const row = integerBetween(0, rows - 1, this.random);
    switch (side) {
      case "left":
        return { x: 0, y: row };
      case "right":
        return { x: columns - 1, y: row };
      case "top":
        return { x: column, y: 0 };
      case "bottom":
        return { x: column, y: rows - 1 };
    }
  }

  /**
   * In welchen Spalten ein Ausgang oben oder unten liegen darf: in der rechten Hälfte
   * (Leserichtung) und, falls der Eingang am selben Rand liegt, rechts vom Eingang, sonst
   * müssten sich An- und Ablauf kreuzen. Die Eckspalten bleiben frei, damit der passende
   * Eingang der nächsten Seite auf jeden Fall noch ein Anlauf-Revier bekommt. Ist `min`
   * größer als `max`, gibt es an diesem Rand keinen möglichen Ausgang.
   */
  private exitColumnRange(side: Side, entrance: Gate, columns: number): ColumnRange {
    const min = Math.floor(columns / 2);
    return {
      min: entrance.side === side ? Math.max(min, entrance.cell.x + 1) : min,
      max: columns - 2,
    };
  }
}
