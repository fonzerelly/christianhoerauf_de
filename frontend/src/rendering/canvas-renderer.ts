import type { PlaybackView } from "../animation/playback-view";
import type { MazePage } from "../domain/pages/maze-page-generator";
import type { RandomSource } from "../domain/random/random-source";
import { DotPainter } from "./dot-painter";
import type { CanvasSurface, DrawingContext, LayerFactory } from "./drawing-context";
import { GlitchScheduler } from "./glitch-scheduler";
import { MonitorEffects } from "./monitor-effects";
import type { MotionPreference } from "./motion-preference";
import type { Renderer } from "./renderer";
import type { RenderSettings } from "./render-settings";
import { scrollShiftsOf } from "./scroll-shifts";
import type { Shift } from "./scroll-shifts";
import type { StageLayout } from "./stage-layout";
import { TrailPainter } from "./trail-painter";
import { WallLayer } from "./wall-layer";

/** Die Teile, aus denen der Renderer gebaut wird. */
export interface CanvasRendererParts {
  /** Das Canvas, auf das gezeichnet wird. */
  readonly canvas: CanvasSurface & CanvasImageSource;
  /** Dessen Zeichenwerkzeug. */
  readonly context: DrawingContext;
  /** Legt Flächen für vorab Gezeichnetes an. */
  readonly createLayer: LayerFactory;
  /** Zufall für Flimmern und Bildstörung. Ein fester Startwert macht Bildtests wiederholbar. */
  readonly random: RandomSource;
  readonly motion: MotionPreference;
  readonly settings: RenderSettings;
  /** Die erste Einteilung der Bühne. */
  readonly layout: StageLayout;
}

/**
 * Zeichnet die Animation auf ein Canvas: Hintergrund, die aktuelle Seite mit Wänden, Leuchtspur
 * und Lichtpunkt (beim Weiterschieben auch die nächste), darüber der Monitor. Wünscht der
 * Besucher weniger Bewegung, entfallen Flimmern und Bildstörung.
 */
export class CanvasRenderer implements Renderer {
  private layout: StageLayout;
  private readonly walls: WallLayer;
  private readonly trail = new TrailPainter();
  private readonly dot = new DotPainter();
  private readonly monitor: MonitorEffects;
  private readonly glitches: GlitchScheduler;

  public constructor(private readonly parts: CanvasRendererParts) {
    this.layout = parts.layout;
    this.walls = new WallLayer(parts.createLayer);
    this.monitor = new MonitorEffects(parts.createLayer, parts.random);
    this.glitches = new GlitchScheduler(parts.random);
    this.resize(parts.layout);
  }

  public get isGlitching(): boolean {
    return this.glitches.current !== undefined;
  }

  public resize(layout: StageLayout): void {
    this.layout = layout;
    const { canvas } = this.parts;
    canvas.style.width = `${String(layout.viewWidth)}px`;
    canvas.style.height = `${String(layout.viewHeight)}px`;
    canvas.width = Math.round(layout.viewWidth * layout.pixelRatio);
    canvas.height = Math.round(layout.viewHeight * layout.pixelRatio);
    this.discardPreparedImages();
    this.glitches.stop();
  }

  public discardPreparedImages(): void {
    this.walls.clear();
    this.monitor.discardPreparedImages();
  }

  public draw(view: PlaybackView, seconds: number): void {
    const { context, settings, motion } = this.parts;
    const { layout } = this;

    // Der Maßstab wird vor JEDEM Bild gesetzt: Der Browser darf den Zeichenzustand eines Canvas
    // jederzeit vergessen (etwa wenn die Seite im Hintergrund lag). Ohne Maßstab würde danach alles
    // in halber Größe in die linke obere Ecke gezeichnet.
    context.setTransform(layout.pixelRatio, 0, 0, layout.pixelRatio, 0, 0);
    context.fillStyle = settings.backgroundColor;
    context.fillRect(0, 0, layout.viewWidth, layout.viewHeight);

    this.drawPages(view);

    const hasMotion = !motion.isReduced;
    if (hasMotion) {
      this.glitches.advance(
        seconds,
        view.isAnimating,
        settings.glitchesPerMinute,
        layout.viewHeight,
      );
    } else {
      this.glitches.stop();
    }
    const glitch = this.glitches.current;
    if (glitch !== undefined) {
      this.monitor.drawGlitch(context, this.parts.canvas, glitch, layout, settings);
    }
    if (hasMotion && view.isAnimating) this.monitor.drawFlicker(context, layout, settings);
    this.monitor.drawOverlay(context, layout, settings);
  }

  private drawPages(view: PlaybackView): void {
    const page = view.currentPage;
    if (page === undefined) return;

    const { columns, rows } = page.grid;
    const shifts = scrollShiftsOf(
      page.exit.side,
      columns,
      rows,
      this.layout.cellSize,
      view.scrollPart,
    );
    this.drawPage(page, shifts.outgoing, view);

    const next = view.nextPage;
    if (next !== undefined) {
      // Die Wände der nächsten Seite entstehen schon vorab. Erst beim Weiterschieben gezeichnet,
      // würde dessen erstes Bild ruckeln.
      if (view.isScrolling) this.drawPage(next, shifts.incoming, undefined);
      else this.walls.imageOf(next, this.layout, this.parts.settings);
    }
    this.walls.keepOnly(next === undefined ? [page] : [page, next]);
  }

  /** Zeichnet eine Seite um `shift` verschoben. Spur und Lichtpunkt gibt es nur auf der aktuellen (mit `view`). */
  private drawPage(page: MazePage, shift: Shift, view: PlaybackView | undefined): void {
    const { context, settings, motion } = this.parts;
    const { layout } = this;

    context.save();
    context.translate(shift.x, shift.y);
    this.walls.draw(context, page, layout, settings);
    if (view !== undefined) {
      // Beschnitten auf die Labyrinth-Fläche: So taucht der Punkt am Eingang auf und verschwindet am Ausgang.
      context.save();
      context.beginPath();
      context.rect(
        layout.offsetX,
        layout.offsetY,
        page.grid.columns * layout.cellSize,
        page.grid.rows * layout.cellSize,
      );
      context.clip();
      this.trail.draw(context, view, page, layout, settings);
      this.dot.draw(context, view, layout, settings, motion);
      context.restore();
    }
    context.restore();
  }
}
