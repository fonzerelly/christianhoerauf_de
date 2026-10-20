import { RectangularGrid } from "../domain/maze/rectangular-grid";
import type { Position } from "../domain/maze/position";
import type { MazePage } from "../domain/pages/maze-page-generator";
import type { Gate } from "../domain/route/gate";
import type { RouteStep, StepKind } from "../domain/route/route-step";

/** Eine Route aus Zellen `[x, y]`, alle Wegstücke von derselben Art und ohne Punkte. */
export function routeOf(kind: StepKind, ...cells: [number, number][]): RouteStep[] {
  return cells.map(([x, y]) => ({ x, y, kind, isDot: false }));
}

/**
 * Baut eine Labyrinth-Seite für Tests aus wenigen Angaben. Ohne Angaben ist es ein Raster von
 * 2 mal 2 Zellen ohne Durchgänge, mit Eingang links oben und Ausgang rechts unten.
 * `passages` sind Paare benachbarter Zellen, zwischen denen die Wand offen ist.
 */
export function mazePage(options: {
  columns?: number;
  rows?: number;
  passages?: [Position, Position][];
  route?: RouteStep[];
  entrance?: Gate;
  exit?: Gate;
  lastGlyphEnd?: number;
}): MazePage {
  const columns = options.columns ?? 2;
  const rows = options.rows ?? 2;
  const grid = new RectangularGrid(columns, rows);
  for (const [first, second] of options.passages ?? []) {
    grid.connect(grid.idOf(first.x, first.y), grid.idOf(second.x, second.y));
  }
  return {
    grid,
    route: options.route ?? [],
    entrance: options.entrance ?? { cell: { x: 0, y: 0 }, side: "left" },
    exit: options.exit ?? { cell: { x: columns - 1, y: rows - 1 }, side: "right" },
    lines: [],
    lastGlyphEnd: options.lastGlyphEnd ?? 0,
  };
}
