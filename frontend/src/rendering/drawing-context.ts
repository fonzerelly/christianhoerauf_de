/**
 * Das Zeichenwerkzeug, soweit die Seite es braucht: ein schmaler Ausschnitt von
 * `CanvasRenderingContext2D`. Der Browser-Kontext erfüllt ihn; im Test steht eine Attrappe
 * dafür, die jeden Aufruf aufzeichnet.
 */
export type DrawingContext = Pick<
  CanvasRenderingContext2D,
  | "fillStyle"
  | "strokeStyle"
  | "lineWidth"
  | "lineCap"
  | "globalAlpha"
  | "globalCompositeOperation"
  | "shadowColor"
  | "shadowBlur"
  | "save"
  | "restore"
  | "setTransform"
  | "translate"
  | "scale"
  | "beginPath"
  | "moveTo"
  | "lineTo"
  | "arc"
  | "rect"
  | "clip"
  | "fill"
  | "stroke"
  | "fillRect"
  | "drawImage"
  | "createRadialGradient"
>;

/** Eine eigene Zeichenfläche abseits des Bildschirms, auf der etwas vorab gezeichnet wird. */
export interface Layer {
  readonly context: DrawingContext;
  /** Die Fläche selbst, um sie auf eine andere zu kopieren. */
  readonly image: CanvasImageSource;
}

/** Legt eine Zeichenfläche an, in Geräte-Pixeln gemessen. */
export type LayerFactory = (width: number, height: number) => Layer;

/** Die sichtbare Zeichenfläche (das Canvas): Größe in Geräte-Pixeln und als Anzeigegröße. */
export interface CanvasSurface {
  width: number;
  height: number;
  readonly style: { width: string; height: string };
}
