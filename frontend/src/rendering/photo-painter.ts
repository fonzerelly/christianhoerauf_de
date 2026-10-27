import type { PhotoName } from "../domain/pages/answer-content";
import type { MazePage } from "../domain/pages/maze-page-generator";
import type { DrawingContext, Layer, LayerFactory } from "./drawing-context";
import type { RenderSettings } from "./render-settings";
import type { StageLayout } from "./stage-layout";

/** Liefert das Bild eines Fotos, sobald es geladen ist; vorher `undefined`. */
export type PhotoImages = (name: PhotoName) => CanvasImageSource | undefined;

/**
 * Wie grob das Foto ist, solange der Lichtpunkt so viele Runden gelaufen ist (Index): so viele
 * Zellen breit ist ein Pixelblock. Nach der letzten Runde ist es scharf.
 */
const CELLS_PER_BLOCK = [2, 1, 0.5];

/**
 * Zeichnet das Foto einer Seite in das Feld, das der Rahmen umschließt. Vor der ersten Runde des
 * Lichtpunkts ist es stark verpixelt, nach jeder Runde feiner, nach der letzten scharf
 * (`CELLS_PER_BLOCK`).
 *
 * Verpixelt wird, indem das Foto erst auf eine winzige Fläche verkleinert wird (ein Pixel je
 * Block) und diese dann ohne Glätten auf die volle Größe gezogen wird. Die verkleinerten Flächen
 * entstehen je Stufe nur einmal.
 */
export class PhotoPainter {
  private readonly pixelated = new Map<string, Layer>();

  public constructor(
    private readonly createLayer: LayerFactory,
    private readonly images: PhotoImages,
  ) {}

  /** Zeichnet das Foto der Seite, so scharf, wie es nach `progress` gelaufenen Wegstücken ist. */
  public draw(
    context: DrawingContext,
    page: MazePage,
    progress: number,
    layout: StageLayout,
    settings: RenderSettings,
  ): void {
    const { photo } = page;
    if (photo === undefined) return;
    const image = this.images(photo.photo);
    if (image === undefined) return;

    // Um die halbe Wandbreite eingerückt, damit der Rahmen ganz zu sehen bleibt.
    const inset = settings.wallWidth / 2;
    const x = layout.offsetX + photo.left * layout.cellSize + inset;
    const y = layout.offsetY + photo.top * layout.cellSize + inset;
    const size = photo.size * layout.cellSize - 2 * inset;

    const lapsDone = photo.lapEnds.filter((end) => progress >= end).length;
    const cellsPerBlock = CELLS_PER_BLOCK[lapsDone];
    if (cellsPerBlock === undefined) {
      context.drawImage(image, x, y, size, size);
      return;
    }

    const blocks = Math.max(1, Math.round(photo.size / cellsPerBlock));
    const small = this.shrunk(photo.photo, image, blocks);
    context.save();
    context.imageSmoothingEnabled = false;
    context.drawImage(small.image, 0, 0, blocks, blocks, x, y, size, size);
    context.restore();
  }

  /** Wirft die verkleinerten Flächen weg (etwa wenn der Browser den Grafikspeicher freigegeben hat). */
  public discardPreparedImages(): void {
    this.pixelated.clear();
  }

  /** Das Foto verkleinert auf `blocks` × `blocks` Pixel, beim ersten Mal neu gezeichnet. */
  private shrunk(name: PhotoName, image: CanvasImageSource, blocks: number): Layer {
    const key = `${name}|${String(blocks)}`;
    const cached = this.pixelated.get(key);
    if (cached !== undefined) return cached;

    const layer = this.createLayer(blocks, blocks);
    layer.context.imageSmoothingQuality = "high";
    layer.context.drawImage(image, 0, 0, blocks, blocks);
    this.pixelated.set(key, layer);
    return layer;
  }
}
