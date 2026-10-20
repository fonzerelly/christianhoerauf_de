import type { RenderSettings } from "./render-settings";
import type { StageLayout } from "./stage-layout";

/** Einstellungen mit einfachen Zahlen, damit Tests des Zeichnens gut nachzurechnen sind. */
export const TEST_SETTINGS: RenderSettings = {
  backgroundColor: "#000",
  wallColor: "#0f0",
  trailColor: "#f00",
  dotColor: "#fa0",
  wallWidth: 2,
  bloomRadius: 3,
  bloomStrength: 0.5,
  trailWidth: 4,
  glow: 4,
  connectorOpacity: 0.25,
  scanlineStrength: 0.3,
  vignetteStrength: 0.5,
  flickerStrength: 0.2,
  glitchesPerMinute: 6,
  glitchStrength: 8,
};

/** Eine Bühne von 100 mal 80 Pixeln mit Zellen zu 10 Pixeln und Pixeldichte 2. */
export const TEST_LAYOUT: StageLayout = {
  viewWidth: 100,
  viewHeight: 80,
  pixelRatio: 2,
  cellSize: 10,
  columns: 8,
  rows: 6,
  offsetX: 5,
  offsetY: 5,
};
