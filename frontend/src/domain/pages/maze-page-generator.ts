import type { Font } from "../font/font";
import { GLYPH_HEIGHT } from "../font/glyph";
import { itemAt } from "../lists";
import { MazeGrower } from "../maze/maze-grower";
import { PathFinder } from "../maze/path-finder";
import { RectangularGrid } from "../maze/rectangular-grid";
import { WindingPathFinder } from "../maze/winding-path-finder";
import type { RandomSource } from "../random/random-source";
import { runToEnd } from "../steps";
import type { Steps } from "../steps";
import { AreaPathFinder } from "../route/area-path-finder";
import type { Gate } from "../route/gate";
import { LineChangePlanner } from "../route/line-change-planner";
import { ROWS_BELOW_PICTURE, RouteBuilder } from "../route/route-builder";
import type { RouteSettings } from "../route/route-builder";
import type { RouteStep } from "../route/route-step";
import { layoutTextBlock } from "../route/text-block-layout";
import type { TextAlignment } from "../route/text-block-layout";
import { WallBreaker } from "../route/wall-breaker";
import type { PlacedPhoto } from "./photo-layout";
import type { PlacedPicture } from "./picture-layout";
import type { WallBreakSettings } from "../route/wall-breaker";

/** So oft umrundet der Lichtpunkt ein Foto; nach jeder Runde wird es schärfer. */
const PHOTO_LAPS = 3;

/** Alle Abstimmungswerte, die das Aussehen eines Labyrinths bestimmen. */
export interface MazeSettings extends RouteSettings, WallBreakSettings {
  /** Gewundenheit der Füll-Gänge (0 bis 1). */
  readonly windiness: number;
}

/** Ein Foto auf einer Seite: wo es liegt und auf welchem Wegstück jede Runde um es herum endet. */
export interface PagePhoto extends PlacedPhoto {
  readonly lapEnds: readonly number[];
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
  /** Das Foto, das auf der Seite liegt; die meisten Seiten haben keins. */
  readonly photo?: PagePhoto;
  /** Wo der Text waagrecht steht (Seiten mit Text). */
  readonly alignment?: TextAlignment;
}

/**
 * Erzeugt Labyrinth-Seiten.
 *
 * Grundidee: Es wird nicht nach einem Labyrinth gesucht, das zufällig den Text enthält. Zuerst
 * wird die Route des Lichtpunkts durch alle Glyphen festgelegt, danach wächst das restliche
 * Labyrinth um sie herum.
 */
export class MazePageGenerator {
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
  public generate(
    lines: readonly string[],
    entrance: Gate | undefined,
    alignment: TextAlignment = "center",
  ): MazePage {
    return runToEnd(this.generateInSteps(lines, entrance, alignment));
  }

  /**
   * Wie `generate`, aber in Stücken (siehe `Steps`), damit ein Aufrufer zwischendurch pausieren
   * kann: erst Ausgang und Route, dann Freibrechen und Wände unterbrechen, zuletzt das Wachsen.
   * Die Reihenfolge der Zufallszüge ist dieselbe wie bei `generate`.
   */
  public *generateInSteps(
    lines: readonly string[],
    givenEntrance: Gate | undefined,
    alignment: TextAlignment = "center",
  ): Steps<MazePage> {
    const block = layoutTextBlock(
      lines,
      this.columns,
      this.rows,
      this.settings.returnBandRows,
      alignment,
    );
    // Laufrichtung „gerade“ (ADR 0007): links herein auf Höhe der ersten Grundlinie, rechts
    // hinaus auf Höhe der letzten.
    const entrance: Gate = givenEntrance ?? {
      cell: { x: 0, y: block.top + GLYPH_HEIGHT },
      side: "left",
    };
    const exit: Gate = { cell: { x: this.columns - 1, y: block.bottom }, side: "right" };
    const { steps: route, lastGlyphEnd } = this.routeBuilder.build(
      lines,
      block,
      this.columns,
      entrance,
      exit,
      alignment,
    );
    yield;

    const grid = new RectangularGrid(this.columns, this.rows);
    this.carveRoute(grid, route);
    this.wallBreaker.breakUpLongWalls(grid, route, lines.length, block);
    yield;

    this.grower.grow(grid, grid.touchedCells(), this.settings.windiness);
    return { grid, route, entrance, exit, lines, lastGlyphEnd, alignment };
  }

  /** Erzeugt eine Seite ohne Text. Führt `generatePathInSteps` ohne Pause aus. */
  public generatePath(entrance: Gate | undefined): MazePage {
    return runToEnd(this.generatePathInSteps(entrance));
  }

  /**
   * Eine Seite für eine Antwort ohne Stichwort: Der Lichtpunkt zieht nur einen Pfad von links nach
   * rechts. Ohne vorige Seite kommt er auf halber Höhe herein; er geht auf der Höhe hinaus, auf
   * der er hereinkam (kam er oben oder unten herein: auf halber Höhe). Keine Zeilen.
   */
  public *generatePathInSteps(givenEntrance: Gate | undefined): Steps<MazePage> {
    const middle = Math.floor(this.rows / 2);
    const entrance: Gate = givenEntrance ?? { cell: { x: 0, y: middle }, side: "left" };
    const exitRow = entrance.side === "left" ? entrance.cell.y : middle;
    const exit: Gate = { cell: { x: this.columns - 1, y: exitRow }, side: "right" };
    const { steps: route, lastGlyphEnd } = this.routeBuilder.buildPath(entrance, exit);
    yield;

    const grid = new RectangularGrid(this.columns, this.rows);
    this.carveRoute(grid, route);
    this.grower.grow(grid, grid.touchedCells(), this.settings.windiness);
    return { grid, route, entrance, exit, lines: [], lastGlyphEnd };
  }

  /**
   * Erzeugt eine Seite, auf der der Lichtpunkt statt eines Texts ein Bild zeichnet. Führt
   * `generatePictureInSteps` ohne Pause aus.
   */
  public generatePicture(placed: PlacedPicture, entrance: Gate | undefined): MazePage {
    return runToEnd(this.generatePictureInSteps(placed, entrance));
  }

  /**
   * Wie `generateInSteps`, nur mit dem Bild statt Zeilen: Ausgang wählen, Route durch das Bild
   * bauen, freibrechen, den Rest wachsen lassen. Lange Wände werden nicht unterbrochen; das gilt
   * nur den Grundlinien und Bändern eines Texts. Die Seite hat keine Zeilen.
   */
  public *generatePictureInSteps(
    placed: PlacedPicture,
    givenEntrance: Gate | undefined,
  ): Steps<MazePage> {
    // Laufrichtung „gerade“ (ADR 0007): links herein, rechts hinaus, auf Höhe der untersten Reihe
    // unter dem Bild, in der der Lichtpunkt zum Bild hinläuft.
    const row = placed.top + placed.picture.height - 1 + ROWS_BELOW_PICTURE;
    const { entrance, exit } = this.straightGates(givenEntrance, row);
    const { steps: route, lastGlyphEnd } = this.routeBuilder.buildPicture(
      placed.picture,
      placed.left,
      placed.top,
      this.columns,
      entrance,
      exit,
    );
    yield;

    const grid = new RectangularGrid(this.columns, this.rows);
    this.carveRoute(grid, route);
    yield;

    this.grower.grow(grid, grid.touchedCells(), this.settings.windiness);
    return { grid, route, entrance, exit, lines: [], lastGlyphEnd };
  }

  /**
   * Erzeugt eine Seite, auf der ein Foto liegt, das der Lichtpunkt umrundet. Führt
   * `generatePhotoInSteps` ohne Pause aus.
   */
  public generatePhoto(placed: PlacedPhoto, entrance: Gate | undefined): MazePage {
    return runToEnd(this.generatePhotoInSteps(placed, entrance));
  }

  /**
   * Wie `generatePictureInSteps`, nur mit einem Foto: Ausgang wählen, Route bauen, die
   * `PHOTO_LAPS`-mal um den Rahmen des Fotos läuft (die Zellen direkt ums Foto), freibrechen, das
   * Feld unter dem Foto zu einem Raum ohne Wände machen, den Rest wachsen lassen. Der Raum ist zum
   * Rahmen hin geschlossen; seine Wände sind der innere Rand des Rahmens. Da alle seine Zellen
   * schon erschlossen sind, wächst kein Gang hinein.
   */
  public *generatePhotoInSteps(
    placed: PlacedPhoto,
    givenEntrance: Gate | undefined,
  ): Steps<MazePage> {
    const frame = {
      left: placed.left - 1,
      right: placed.left + placed.size,
      top: placed.top - 1,
      bottom: placed.top + placed.size,
    };
    // Laufrichtung „gerade“: auf Höhe der untersten Reihe des Rahmens.
    const { entrance, exit } = this.straightGates(givenEntrance, frame.bottom);
    const {
      steps: route,
      lastGlyphEnd,
      lapEnds,
    } = this.routeBuilder.buildPhoto(frame, PHOTO_LAPS, this.columns, entrance, exit);
    yield;

    const grid = new RectangularGrid(this.columns, this.rows);
    this.carveRoute(grid, route);
    this.openRoom(grid, placed);
    yield;

    this.grower.grow(grid, grid.touchedCells(), this.settings.windiness);
    const photo = { ...placed, lapEnds };
    return { grid, route, entrance, exit, lines: [], lastGlyphEnd, photo };
  }

  /**
   * Ein- und Ausgang einer Seite mit Bild oder Foto: Der Eingang ist gegeben (gegenüber dem
   * vorigen Ausgang) oder liegt links in `row`; der Ausgang liegt rechts in `row`.
   */
  private straightGates(
    givenEntrance: Gate | undefined,
    row: number,
  ): { entrance: Gate; exit: Gate } {
    return {
      entrance: givenEntrance ?? { cell: { x: 0, y: row }, side: "left" },
      exit: { cell: { x: this.columns - 1, y: row }, side: "right" },
    };
  }

  /** Öffnet alle Wände zwischen den Zellen unter dem Foto; die Wände nach außen bleiben. */
  private openRoom(grid: RectangularGrid, { left, top, size }: PlacedPhoto): void {
    for (let y = top; y < top + size; y++) {
      for (let x = left; x < left + size; x++) {
        if (x + 1 < left + size) grid.connect(grid.idOf(x, y), grid.idOf(x + 1, y));
        if (y + 1 < top + size) grid.connect(grid.idOf(x, y), grid.idOf(x, y + 1));
      }
    }
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
