import type { RenderSettings } from "./render-settings";

/**
 * Das Aussehen für Zellen, die `factor`-mal so groß sind wie die der Bühne: Wände, Lichthof,
 * Leuchtspur und Schein werden im selben Maß dünner bzw. kleiner, damit eine Seite im feineren
 * Raster (Gimmick) nicht dicker aussieht als die übrigen. Farben und Monitor-Effekte bleiben.
 */
export function scaledLook(settings: RenderSettings, factor: number): RenderSettings {
  return {
    ...settings,
    wallWidth: settings.wallWidth * factor,
    bloomRadius: settings.bloomRadius * factor,
    trailWidth: settings.trailWidth * factor,
    glow: settings.glow * factor,
  };
}
