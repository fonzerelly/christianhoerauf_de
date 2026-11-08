import type { Position } from "../domain/maze/position";

/** Kleiner wird keine Zelle gezeichnet: darunter verschwimmen die Wände (Prototyp 12). */
const SMALLEST_CELL = 4;

/** Schmaler darf das Raster nie werden: so viel braucht ein einzelnes Zeichen samt freien Rändern. */
const MIN_COLUMNS = 10;

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
 * Teilt die Bühne in das Raster ein: so breit wie die Bühne, genau `rows` Reihen hoch; die Höhe
 * der Bühne ergibt sich daraus (`viewHeight`). Die Pixeldichte des Geräts wird auf `maxPixelRatio` gedeckelt,
 * sonst hätte jedes Bild am Handy neunmal so viele Pixel. Bei fester Spaltenzahl ergibt sich die
 * Zellgröße aus der Breite, abgerundet auf ganze Geräte-Pixel, damit alle Wände gleich scharf werden.
 */
export function layoutStage(
  viewWidth: number,
  devicePixelRatio: number,
  maxPixelRatio: number,
  sizing: StageSizing,
  rows: number,
): StageLayout {
  const pixelRatio = Math.min(devicePixelRatio || 1, maxPixelRatio);
  const cellSize =
    "columns" in sizing
      ? Math.floor((viewWidth * pixelRatio) / sizing.columns) / pixelRatio
      : sizing.cellSize;

  const columns = Math.max(
    MIN_COLUMNS,
    "columns" in sizing ? sizing.columns : Math.floor(viewWidth / cellSize),
  );
  return {
    viewWidth,
    // Die Bühne ist genau so hoch wie ihre Reihen (ADR 0007); das Raster steht oben bündig.
    viewHeight: rows * cellSize,
    pixelRatio,
    cellSize,
    columns,
    rows,
    // auf ganze Pixel gerundet, damit die vorab gezeichneten Wände scharf bleiben
    offsetX: Math.floor((viewWidth - columns * cellSize) / 2),
    offsetY: 0,
  };
}

/** Der Mittelpunkt einer Zelle auf der Bühne. Funktioniert auch für Stellen zwischen zwei Zellen (x = 3,4). */
export function cellCenterOn(layout: StageLayout, cell: Position): Position {
  return {
    x: layout.offsetX + (cell.x + 0.5) * layout.cellSize,
    y: layout.offsetY + (cell.y + 0.5) * layout.cellSize,
  };
}

/**
 * Die Einteilung für eine Seite: Im Raster der Bühne (`cellScale` fehlt) ist es die der Bühne.
 * Eine Seite im feineren Raster (Gimmick, ADR 0007) bekommt die größte Zelle, mit der ihr Raster
 * auf die Labyrinth-Fläche der Bühne passt, auf ganze Geräte-Pixel abgerundet, und steht darin
 * mittig.
 */
export function pageLayoutOf(
  layout: StageLayout,
  grid: { readonly columns: number; readonly rows: number },
  cellScale: number | undefined,
): StageLayout {
  if (cellScale === undefined) return layout;
  const { pixelRatio } = layout;
  const areaWidth = layout.columns * layout.cellSize;
  const areaHeight = layout.rows * layout.cellSize;
  const fitting = (length: number, cells: number): number =>
    Math.floor((length * pixelRatio) / cells) / pixelRatio;
  const cellSize = Math.min(fitting(areaWidth, grid.columns), fitting(areaHeight, grid.rows));
  return {
    ...layout,
    cellSize,
    columns: grid.columns,
    rows: grid.rows,
    offsetX: layout.offsetX + Math.floor((areaWidth - grid.columns * cellSize) / 2),
    offsetY: layout.offsetY + Math.floor((areaHeight - grid.rows * cellSize) / 2),
  };
}

/**
 * Das feinere Raster mit mindestens `rows` Reihen auf der Labyrinth-Fläche der Bühne (wie
 * Prototyp 12): die Zelle aus der Höhe, auf ganze Geräte-Pixel abgerundet; dann so viele Spalten
 * und Reihen, wie davon auf die Fläche passen. So füllt das Raster die ganze Breite. Würde die
 * Zelle kleiner als 4 px: `undefined` (dann schreibt der Lichtpunkt das Stichwort).
 */
export function fineGridOn(
  layout: StageLayout,
  rows: number,
): { readonly columns: number; readonly rows: number } | undefined {
  const { pixelRatio } = layout;
  const areaWidth = layout.columns * layout.cellSize;
  const areaHeight = layout.rows * layout.cellSize;
  const cellSize = Math.floor((areaHeight * pixelRatio) / rows) / pixelRatio;
  if (cellSize < SMALLEST_CELL) return undefined;
  return {
    columns: Math.floor(areaWidth / cellSize),
    rows: Math.floor(areaHeight / cellSize),
  };
}
