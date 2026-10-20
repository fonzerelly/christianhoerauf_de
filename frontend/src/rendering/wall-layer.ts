import type { MazePage } from "../domain/pages/maze-page-generator";
import { runToEnd } from "../domain/steps";
import type { Steps } from "../domain/steps";
import type { DrawingContext, Layer, LayerFactory } from "./drawing-context";
import type { RenderSettings } from "./render-settings";
import type { StageLayout } from "./stage-layout";

/** Ein vorab gezeichnetes Wandbild samt dem Rand ringsum, den der Lichthof braucht. */
export interface WallImage {
  readonly layer: Layer;
  /** Das Bild ist ringsum um diesen Rand größer als das Labyrinth, damit der Lichthof nicht abgeschnitten wird. */
  readonly padding: number;
  /** Größe des Bildes in Pixeln der Seite. */
  readonly width: number;
  readonly height: number;
  /** Alles, was das Aussehen bestimmt hat; ändert es sich, ist das Bild veraltet. */
  readonly look: string;
}

/** Wie die Wände aussehen sollen, als ein Text. Ändert er sich, muss das Wandbild neu entstehen. */
function lookOf(layout: StageLayout, settings: RenderSettings): string {
  return [
    settings.wallWidth,
    settings.wallColor,
    settings.bloomRadius,
    settings.bloomStrength,
    layout.cellSize,
    layout.pixelRatio,
  ].join("|");
}

/**
 * Legt alle Wände einer Seite als Linien in den Pfad von `context` (Ursprung = linke obere Ecke
 * des Labyrinths), mit Lücken an Eingang und Ausgang. Zeichnet selbst noch nichts.
 */
export function traceWalls(context: DrawingContext, page: MazePage, cellSize: number): void {
  const { grid, entrance, exit } = page;
  const isOpening = (x: number, y: number, side: string): boolean =>
    [entrance, exit].some(
      (opening) => opening.side === side && opening.cell.x === x && opening.cell.y === y,
    );
  const wall = (x1: number, y1: number, x2: number, y2: number): void => {
    context.moveTo(x1 * cellSize, y1 * cellSize);
    context.lineTo(x2 * cellSize, y2 * cellSize);
  };

  context.beginPath();
  for (let y = 0; y < grid.rows; y++) {
    for (let x = 0; x < grid.columns; x++) {
      const isLastColumn = x === grid.columns - 1;
      const isLastRow = y === grid.rows - 1;
      const hasRightWall = isLastColumn ? !isOpening(x, y, "right") : !grid.isOpenRight(x, y);
      const hasBottomWall = isLastRow ? !isOpening(x, y, "bottom") : !grid.isOpenDown(x, y);

      if (hasRightWall) wall(x + 1, y, x + 1, y + 1);
      if (hasBottomWall) wall(x, y + 1, x + 1, y + 1);
      if (x === 0 && !isOpening(x, y, "left")) wall(0, y, 0, y + 1);
      if (y === 0 && !isOpening(x, y, "top")) wall(x, 0, x + 1, 0);
    }
  }
}

/**
 * Die Wände der Labyrinth-Seiten, vorab gezeichnet.
 *
 * Nachgeahmt wird ein alter Röhrenmonitor: Wo der Elektronenstrahl den Leuchtschirm trifft,
 * leuchtet nicht nur der getroffene Punkt, sondern auch seine Umgebung schwach mit
 * ("Überstrahlen"). Die Wände entstehen deshalb in drei Schichten, von unten nach oben:
 * ein weicher Lichthof, die Linie selbst und ein schmaler, fast weißer Kern.
 *
 * Der Lichthof über tausende Wandstücke ist die mit Abstand teuerste Zeichenoperation. Darum
 * wird jede Seite einmal auf eine eigene Fläche gezeichnet und danach nur noch kopiert.
 */
export class WallLayer {
  private readonly images = new Map<MazePage, WallImage>();

  public constructor(private readonly createLayer: LayerFactory) {}

  /** Das fertige Wandbild einer Seite. Es entsteht beim ersten Mal und wird aufgehoben, bis sich das Aussehen ändert. */
  public imageOf(page: MazePage, layout: StageLayout, settings: RenderSettings): WallImage {
    const cached = this.images.get(page);
    if (cached?.look === lookOf(layout, settings)) return cached;

    const fresh = runToEnd(this.render(page, layout, settings, false));
    this.images.set(page, fresh);
    return fresh;
  }

  /**
   * Zeichnet das Wandbild der Seite vorab, in Stücken (siehe `Steps`), damit der Browser
   * zwischendurch Bilder zeichnen und Eingaben bearbeiten kann. Nach jedem Stück ist das
   * Gezeichnete wirklich ausgeführt (`flush`). Ist das Bild schon da, passiert nichts.
   */
  public *prepare(page: MazePage, layout: StageLayout, settings: RenderSettings): Steps<void> {
    if (this.images.get(page)?.look === lookOf(layout, settings)) return;

    this.images.set(page, yield* this.render(page, layout, settings, true));
  }

  /** Kopiert das Wandbild der Seite so auf `context`, dass das Labyrinth an seinem Platz auf der Bühne steht. */
  public draw(
    context: DrawingContext,
    page: MazePage,
    layout: StageLayout,
    settings: RenderSettings,
  ): void {
    const { layer, padding, width, height } = this.imageOf(page, layout, settings);
    context.drawImage(
      layer.image,
      layout.offsetX - padding,
      layout.offsetY - padding,
      width,
      height,
    );
  }

  /** Wirft die Wandbilder aller anderen Seiten weg; jedes Bild ist so groß wie der Bildschirm. */
  public keepOnly(pages: readonly MazePage[]): void {
    for (const page of this.images.keys()) {
      if (!pages.includes(page)) this.images.delete(page);
    }
  }

  /** Wirft alle Wandbilder weg, etwa weil der Browser den Grafikspeicher freigegeben haben könnte. */
  public clear(): void {
    this.images.clear();
  }

  /**
   * Zeichnet die Wände einer Seite auf eine neue Fläche, in drei Stücken: erster und zweiter
   * Strich des Lichthofs (jeder rechnet das Leuchten über alle Wände und ist der größte Brocken),
   * dann Linie und Kern. Mit `flushAfterStep` wird jedes Stück sofort ausgeführt; sonst rechnet
   * der Browser alles erst beim ersten Kopieren der Fläche, was für den Aufrufer ohne Pausen
   * dasselbe ergibt und billiger ist.
   */
  private *render(
    page: MazePage,
    layout: StageLayout,
    settings: RenderSettings,
    flushAfterStep: boolean,
  ): Steps<WallImage> {
    const { pixelRatio, cellSize } = layout;
    const padding = Math.ceil(settings.wallWidth + 2 * settings.bloomRadius);
    const layer = this.createLayer(
      Math.ceil((page.grid.columns * cellSize + 2 * padding) * pixelRatio),
      Math.ceil((page.grid.rows * cellSize + 2 * padding) * pixelRatio),
    );
    const { context } = layer;
    context.scale(pixelRatio, pixelRatio);
    context.translate(padding, padding);
    context.lineCap = "square";
    traceWalls(context, page, cellSize);

    const finishStep = (): void => {
      if (flushAfterStep) layer.flush();
    };

    // 1. Lichthof: der "Schatten" der Linie in ihrer eigenen Farbe, ohne Versatz. Zweimal
    //    übereinander, sonst ist er zu schwach, um als Leuchten zu wirken.
    context.save();
    context.strokeStyle = settings.wallColor;
    context.lineWidth = settings.wallWidth;
    context.shadowColor = settings.wallColor;
    // Schatten-Angaben rechnet der Browser in Geräte-Pixeln, deshalb von Hand mit der Pixeldichte malnehmen.
    context.shadowBlur = settings.bloomRadius * pixelRatio;
    context.globalAlpha = settings.bloomStrength;
    context.stroke();
    finishStep();
    yield;
    context.stroke();
    context.restore();
    finishStep();
    yield;

    // 2. die Linie selbst
    context.strokeStyle = settings.wallColor;
    context.lineWidth = settings.wallWidth;
    context.stroke();

    // 3. der überhelle Kern
    context.strokeStyle = "#ffffff";
    context.globalAlpha = 0.55;
    context.lineWidth = settings.wallWidth / 3;
    context.stroke();
    finishStep();

    return {
      layer,
      padding,
      width: page.grid.columns * cellSize + 2 * padding,
      height: page.grid.rows * cellSize + 2 * padding,
      look: lookOf(layout, settings),
    };
  }
}
