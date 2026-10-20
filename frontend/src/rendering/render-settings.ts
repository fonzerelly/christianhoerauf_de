/** Alles, was das Aussehen des Bildes bestimmt. Anteile (Stärke, Deckkraft) liegen zwischen 0 und 1. */
export interface RenderSettings {
  // Farben
  readonly backgroundColor: string;
  readonly wallColor: string;
  readonly trailColor: string;
  readonly dotColor: string;
  // Wände (Röhrenmonitor: Linie mit Lichthof)
  readonly wallWidth: number;
  readonly bloomRadius: number;
  readonly bloomStrength: number;
  // Leuchtspur
  readonly trailWidth: number;
  readonly glow: number;
  readonly connectorOpacity: number;
  // Monitor
  readonly scanlineStrength: number;
  readonly vignetteStrength: number;
  readonly flickerStrength: number;
  /** Wie oft pro Minute eine Bildstörung beginnt (im Mittel). */
  readonly glitchesPerMinute: number;
  /** Wie weit die Zeilen einer Bildstörung seitlich verrutschen, in Pixeln. */
  readonly glitchStrength: number;
}
