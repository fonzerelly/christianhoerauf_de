/** Kennzeichnet eine Zelle eines Labyrinths; die Bedeutung kennt nur der Graph selbst. */
export type CellId = number;

/**
 * Die Zellen eines Labyrinths und die Durchgänge dazwischen.
 *
 * Wachsen lassen, Wegsuche und Freibrechen arbeiten nur gegen diese Schnittstelle. Ein anderes
 * Raster (etwa ein rundes Labyrinth) braucht eine weitere Umsetzung, aber keinen neuen
 * Algorithmus.
 *
 * Jede Zelle ist zu Beginn zugemauert und unberührt. Eine Zelle gilt als "berührt", sobald ein
 * Durchgang zu ihr gebrochen oder sie von Hand so markiert wurde.
 */
export interface CellGraph {
  /** Die Nachbarn der Zelle im Raster, unabhängig davon, ob ein Durchgang besteht. */
  neighboursOf(cell: CellId): readonly CellId[];

  /** Gibt es zwischen den beiden benachbarten Zellen einen Durchgang? */
  isConnected(first: CellId, second: CellId): boolean;

  /** Bricht die Wand zwischen zwei benachbarten Zellen heraus und berührt beide. */
  connect(first: CellId, second: CellId): void;

  isTouched(cell: CellId): boolean;

  /** Berührt eine Zelle, ohne einen Durchgang zu brechen (sie gilt dann als belegt). */
  touch(cell: CellId): void;

  /** Alle berührten Zellen in der Reihenfolge ihrer Nummern. */
  touchedCells(): readonly CellId[];
}
