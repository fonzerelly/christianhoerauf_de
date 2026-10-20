import type { RandomSource } from "../domain/random/random-source";
import type { DrawingContext, Layer, LayerFactory } from "./drawing-context";
import type { Glitch } from "./glitch-scheduler";
import type { RenderSettings } from "./render-settings";
import type { StageLayout } from "./stage-layout";

/** Jede so-vielte Bildschirmzeile ist abgedunkelt (das Zeilenraster der Röhre). */
const SCANLINE_SPACING = 3;
/** Das Flimmern dunkelt das Bild höchstens um diesen Anteil der eingestellten Stärke ab. */
const FLICKER_PART = 0.25;
/** Ein Streifen der Bildstörung ist mindestens so hoch und höchstens so viel höher (Pixel, ganzzahlig). */
const SHORTEST_STRIP = 2;
const STRIP_RANGE = 6;
/** Der Streifen am Ende des Balkens kann so weit über ihn hinausragen. */
const LONGEST_OVERHANG = SHORTEST_STRIP + STRIP_RANGE - 1;
/** Bei der Kopie des Balkens kommen so viele Geräte-Zeilen Rand dazu, weil das Skalieren Nachbarzeilen mitliest. */
const COPY_MARGIN = 2;
/** So viele Rausch-Striche liegen in einem Störbalken. */
const NOISE_DASHES = 12;

interface Overlay {
  readonly layer: Layer;
  readonly look: string;
}

/**
 * Alles, was das Bild nach alter Bildröhre aussehen lässt, außer den Wänden: die Glasscheibe
 * (Zeilenraster und dunkle Ecken), das Flimmern und die Bildstörung.
 */
export class MonitorEffects {
  private overlay: Overlay | undefined;
  /** Kopie des fertigen Bildes, aus der eine Bildstörung ihre Streifen liest. */
  private glitchSource: { readonly layer: Layer; readonly size: string } | undefined;

  public constructor(
    private readonly createLayer: LayerFactory,
    private readonly random: RandomSource,
  ) {}

  /** Legt die Glasscheibe über das Bild. Sie wird vorab gezeichnet und nur neu, wenn sie veraltet ist. */
  public drawOverlay(context: DrawingContext, layout: StageLayout, settings: RenderSettings): void {
    const overlay = this.currentOverlay(layout, settings, false);
    context.drawImage(overlay.layer.image, 0, 0, layout.viewWidth, layout.viewHeight);
  }

  /**
   * Zeichnet die Glasscheibe schon jetzt vor und führt das sofort aus, statt es dem ersten Bild
   * zu überlassen. Ist sie aktuell, passiert nichts.
   */
  public prepareOverlay(layout: StageLayout, settings: RenderSettings): void {
    this.currentOverlay(layout, settings, true);
  }

  /** Leichtes Flimmern: Jedes Bild ist zufällig eine Spur dunkler. */
  public drawFlicker(context: DrawingContext, layout: StageLayout, settings: RenderSettings): void {
    const darkening = this.random.next() * settings.flickerStrength * FLICKER_PART;
    context.fillStyle = `rgba(0, 0, 0, ${String(darkening)})`;
    context.fillRect(0, 0, layout.viewWidth, layout.viewHeight);
  }

  /**
   * Zeichnet die laufende Störung über das fertige Bild (`canvas`): Im Störbalken verrutschen die
   * Bildzeilen seitlich, dazu kommen ein heller Schleier und ein paar Rausch-Striche.
   *
   * Die Streifen werden aus einer Kopie des Balkens gelesen, nicht aus dem Canvas selbst. Zeichnet
   * man ein Canvas auf sich selbst, legt der Browser vor jedem Streifen eine Kopie des ganzen Canvas
   * an; bei dreißig Streifen je Bild kostete das auf einem Handy mehrere hundert Millisekunden.
   * Das Ergebnis ist dasselbe, denn jeder Streifen liest Zeilen, die ein früherer Streifen nicht
   * überschrieben hat. Kopiert werden nur die Zeilen des Balkens, das spart gegenüber dem ganzen
   * Bild noch einmal gut eine Millisekunde je Bild.
   */
  public drawGlitch(
    context: DrawingContext,
    canvas: CanvasImageSource,
    glitch: Glitch,
    layout: StageLayout,
    settings: RenderSettings,
  ): void {
    const { viewWidth: width, viewHeight: height } = layout;
    // Der Balken startet knapp über dem Bild und endet knapp darunter
    const bandTop = Math.max(0, glitch.part * (height + glitch.bandHeight) - glitch.bandHeight);
    const bandBottom = Math.min(height, glitch.part * (height + glitch.bandHeight));

    if (bandTop < bandBottom) {
      this.drawShiftedRows(
        context,
        this.copyOfBand(canvas, layout, bandTop, bandBottom),
        bandTop,
        bandBottom,
        layout,
        settings,
      );
    }

    context.save();
    context.globalCompositeOperation = "lighter"; // Farben addieren sich: es wird nur heller
    context.fillStyle = settings.wallColor;
    context.globalAlpha = 0.07;
    context.fillRect(0, bandTop, width, bandBottom - bandTop);
    context.globalAlpha = 0.5;
    for (let dash = 0; dash < NOISE_DASHES; dash++) {
      const dashY = bandTop + this.random.next() * (bandBottom - bandTop);
      context.fillRect(this.random.next() * width, dashY, 10 + this.random.next() * 60, 1);
    }
    context.restore();
  }

  /** Verrutschte Zeilen: schmale Streifen des Bildes `source` werden seitlich versetzt darübergelegt. */
  private drawShiftedRows(
    context: DrawingContext,
    source: Layer,
    bandTop: number,
    bandBottom: number,
    layout: StageLayout,
    settings: RenderSettings,
  ): void {
    const { viewWidth: width, pixelRatio } = layout;
    const deviceWidth = Math.round(width * pixelRatio);
    let y = bandTop;
    while (y < bandBottom) {
      const stripHeight = SHORTEST_STRIP + Math.floor(this.random.next() * STRIP_RANGE);
      const shift = (this.random.next() - 0.5) * 2 * settings.glitchStrength;
      context.drawImage(
        source.image,
        0,
        y * pixelRatio,
        deviceWidth,
        stripHeight * pixelRatio, // Ausschnitt in Geräte-Pixeln
        shift,
        y,
        width,
        stripHeight,
      );
      y += stripHeight;
    }
  }

  /**
   * Kopiert die Zeilen des Balkens (samt Rand und dem Überhang des letzten Streifens) aus dem fertigen
   * Bild an dieselbe Stelle der Fläche für Bildstörungen. Sie wird beim ersten Mal und bei neuer
   * Bildgröße angelegt. Die Kopie liegt auf ganzen Geräte-Zeilen, damit sie die Pixel unverändert übernimmt;
   * übrige Zeilen der Fläche sind veraltet, werden aber von keinem Streifen gelesen.
   */
  private copyOfBand(
    canvas: CanvasImageSource,
    layout: StageLayout,
    bandTop: number,
    bandBottom: number,
  ): Layer {
    const { pixelRatio } = layout;
    const width = Math.round(layout.viewWidth * pixelRatio);
    const height = Math.round(layout.viewHeight * pixelRatio);
    const size = `${String(width)}x${String(height)}`;
    if (this.glitchSource?.size !== size) {
      this.glitchSource = { layer: this.createLayer(width, height), size };
    }
    const { layer } = this.glitchSource;

    const top = Math.max(0, Math.floor(bandTop * pixelRatio) - COPY_MARGIN);
    const bottom = Math.min(
      height,
      Math.ceil((bandBottom + LONGEST_OVERHANG) * pixelRatio) + COPY_MARGIN,
    );
    layer.context.drawImage(canvas, 0, top, width, bottom - top, 0, top, width, bottom - top);
    return layer;
  }

  /** Wirft die vorab gezeichnete Glasscheibe und die Kopie für Bildstörungen weg; sie entstehen beim nächsten Bild neu. */
  public discardPreparedImages(): void {
    this.overlay = undefined;
    this.glitchSource = undefined;
  }

  /** Die aktuelle Glasscheibe; ist sie veraltet, wird sie neu gezeichnet (und auf Wunsch gleich ausgeführt). */
  private currentOverlay(layout: StageLayout, settings: RenderSettings, flush: boolean): Overlay {
    const look = [
      Math.round(layout.viewWidth * layout.pixelRatio),
      Math.round(layout.viewHeight * layout.pixelRatio),
      settings.scanlineStrength,
      settings.vignetteStrength,
    ].join("|");
    if (this.overlay?.look !== look) {
      const layer = this.renderOverlay(layout, settings);
      if (flush) layer.flush();
      this.overlay = { layer, look };
    }
    return this.overlay;
  }

  private renderOverlay(layout: StageLayout, settings: RenderSettings): Layer {
    const { viewWidth: width, viewHeight: height, pixelRatio } = layout;
    const layer = this.createLayer(Math.round(width * pixelRatio), Math.round(height * pixelRatio));
    const { context } = layer;
    context.scale(pixelRatio, pixelRatio);

    context.fillStyle = `rgba(0, 0, 0, ${String(settings.scanlineStrength)})`;
    for (let y = 0; y < height; y += SCANLINE_SPACING) {
      context.fillRect(0, y, width, 1);
    }

    const darkCorners = context.createRadialGradient(
      width / 2,
      height / 2,
      Math.min(width, height) * 0.35,
      width / 2,
      height / 2,
      Math.hypot(width, height) / 2,
    );
    darkCorners.addColorStop(0, "rgba(0, 0, 0, 0)");
    darkCorners.addColorStop(1, `rgba(0, 0, 0, ${String(settings.vignetteStrength)})`);
    context.fillStyle = darkCorners;
    context.fillRect(0, 0, width, height);
    return layer;
  }
}
