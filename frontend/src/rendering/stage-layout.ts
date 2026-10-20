import type { Position } from "../domain/maze/position";

/** Kleiner darf das Raster nie werden: so viel braucht ein einzelnes Zeichen samt freien Rändern. */
const MIN_COLUMNS = 10;
const MIN_ROWS = 10;

/** Wie das Raster auf der Bühne eingeteilt wird: feste Spaltenzahl (Handy) oder feste Zellgröße in Pixeln (Desktop). */
export type StageSizing = { readonly columns: number } | { readonly cellSize: number };

/** Die Einteilung der Bühne: Größe, Pixeldichte, Zellgröße, Raster und Rand zum Zentrieren. */
export interface StageLayout {
  /** Größe der Bühne in Pixeln der Seite. */
  readonly viewWidth: number;
  readonly viewHeight: number;
  /** Geräte-Pixel je Pixel der Seite, mit denen das Canvas gezeichnet wird. */
  readonly pixelRatio: number;
  /** Kantenlänge einer Zelle in Pixeln der Seite. */
  readonly cellSize: number;
  readonly columns: number;
  readonly rows: number;
  /** Abstand des Rasters vom Rand der Bühne, damit es mittig steht. */
  readonly offsetX: number;
  readonly offsetY: number;
}

/**
 * Teilt die Bühne in das Raster ein. Die Pixeldichte des Geräts wird auf `maxPixelRatio` gedeckelt,
 * sonst hätte jedes Bild am Handy neunmal so viele Pixel. Bei fester Spaltenzahl ergibt sich die
 * Zellgröße aus der Breite, abgerundet auf ganze Geräte-Pixel, damit alle Wände gleich scharf werden.
 */
export function layoutStage(
  view: { readonly width: number; readonly height: number },
  devicePixelRatio: number,
  maxPixelRatio: number,
  sizing: StageSizing,
): StageLayout {
  const pixelRatio = Math.min(devicePixelRatio || 1, maxPixelRatio);
  const cellSize =
    "columns" in sizing
      ? Math.floor((view.width * pixelRatio) / sizing.columns) / pixelRatio
      : sizing.cellSize;

  const columns = Math.max(
    MIN_COLUMNS,
    "columns" in sizing ? sizing.columns : Math.floor(view.width / cellSize),
  );
  const rows = Math.max(MIN_ROWS, Math.floor(view.height / cellSize));
  return {
    viewWidth: view.width,
    viewHeight: view.height,
    pixelRatio,
    cellSize,
    columns,
    rows,
    // auf ganze Pixel gerundet, damit die vorab gezeichneten Wände scharf bleiben
    offsetX: Math.floor((view.width - columns * cellSize) / 2),
    offsetY: Math.floor((view.height - rows * cellSize) / 2),
  };
}

/** Der Mittelpunkt einer Zelle auf der Bühne. Funktioniert auch für Stellen zwischen zwei Zellen (x = 3,4). */
export function cellCenterOn(layout: StageLayout, cell: Position): Position {
  return {
    x: layout.offsetX + (cell.x + 0.5) * layout.cellSize,
    y: layout.offsetY + (cell.y + 0.5) * layout.cellSize,
  };
}
