import type { Font } from "../font/font";
import { itemAt } from "../lists";
import { MazeGrower } from "../maze/maze-grower";
import { PathFinder } from "../maze/path-finder";
import { RectangularGrid } from "../maze/rectangular-grid";
import { WindingPathFinder } from "../maze/winding-path-finder";
import type { RandomSource } from "../random/random-source";
import { AreaPathFinder } from "../route/area-path-finder";
import { BorderCellPicker } from "../route/border-cell-picker";
import type { Gate } from "../route/gate";
import { LineChangePlanner } from "../route/line-change-planner";
import { RouteBuilder } from "../route/route-builder";
import type { RouteSettings } from "../route/route-builder";
import type { RouteStep } from "../route/route-step";
import { layoutTextBlock } from "../route/text-block-layout";
import { WallBreaker } from "../route/wall-breaker";
import type { WallBreakSettings } from "../route/wall-breaker";

/** Alle Abstimmungswerte, die das Aussehen eines Labyrinths bestimmen. */
export interface MazeSettings extends RouteSettings, WallBreakSettings {
  /** Gewundenheit der Füll-Gänge (0 bis 1). */
  readonly windiness: number;
}

/** Eine fertige Labyrinth-Seite: Wände, Route, Eingang und Ausgang und der Text darauf. */
export interface MazePage {
  readonly grid: RectangularGrid;
  readonly route: readonly RouteStep[];
  readonly entrance: Gate;
  readonly exit: Gate;
  readonly lines: readonly string[];
  /** Index des Wegstücks in `route`, auf dem die letzte Glyphe der Seite endet. */
  readonly lastGlyphEnd: number;
}

/**
 * Erzeugt Labyrinth-Seiten.
 *
 * Grundidee: Es wird nicht nach einem Labyrinth gesucht, das zufällig den Text enthält. Zuerst
 * wird die Route des Lichtpunkts durch alle Glyphen festgelegt, danach wächst das restliche
 * Labyrinth um sie herum.
 */
export class MazePageGenerator {
  private readonly borderCellPicker: BorderCellPicker;
  private readonly routeBuilder: RouteBuilder;
  private readonly wallBreaker: WallBreaker;
  private readonly grower: MazeGrower;

  public constructor(
    private readonly columns: number,
    private readonly rows: number,
    random: RandomSource,
    font: Font,
    private readonly settings: MazeSettings,
  ) {
    this.grower = new MazeGrower(random);
    const areaPathFinder = new AreaPathFinder(
      columns,
      rows,
      new WindingPathFinder(this.grower, new PathFinder()),
    );
    this.borderCellPicker = new BorderCellPicker(random);
    this.routeBuilder = new RouteBuilder(
      font,
      areaPathFinder,
      new LineChangePlanner(areaPathFinder),
      settings,
    );
    this.wallBreaker = new WallBreaker(random, settings);
  }

  /**
   * Erzeugt eine Seite für die Textzeilen: Ausgang wählen, Route bauen, freibrechen, lange Wände
   * unterbrechen, den Rest wachsen lassen. Die Zeilen müssen mindestens ein darstellbares Zeichen
   * enthalten.
   */
  public generate(lines: readonly string[], entrance: Gate): MazePage {
    const exit = this.borderCellPicker.pickExit(entrance, this.columns, this.rows);
    const block = layoutTextBlock(lines, this.columns, this.rows, this.settings.returnBandRows);
    const { steps: route, lastGlyphEnd } = this.routeBuilder.build(
      lines,
      block,
      this.columns,
      entrance,
      exit,
    );

    const grid = new RectangularGrid(this.columns, this.rows);
    this.carveRoute(grid, route);
    this.wallBreaker.breakUpLongWalls(grid, route, lines.length, block);
    this.grower.grow(grid, grid.touchedCells(), this.settings.windiness);

    return { grid, route, entrance, exit, lines, lastGlyphEnd };
  }

  /** Bricht entlang der Route alle Wände heraus. Außerhalb des Rasters gibt es keine Wände. */
  private carveRoute(grid: RectangularGrid, route: readonly RouteStep[]): void {
    route.slice(1).forEach((step, index) => {
      const before = itemAt(route, index);
      if (grid.contains(before.x, before.y) && grid.contains(step.x, step.y)) {
        grid.connect(grid.idOf(before.x, before.y), grid.idOf(step.x, step.y));
      }
    });
  }
}
