import { DESKTOP_FROM_WIDTH } from "../config/tuning";
import type { ProfileName } from "../config/tuning";

/**
 * Wählt das Geräteprofil: der Wunsch aus der Adresse (`?profil=`), sonst `desktop` ab
 * `DESKTOP_FROM_WIDTH` Pixeln Fensterbreite und darunter `handy`. Gewählt wird einmal beim Laden;
 * danach bleibt es, sonst änderte sich beim Drehen des Handys das ganze Bild.
 */
export function selectProfile(windowWidth: number, requested?: ProfileName): ProfileName {
  if (requested !== undefined) return requested;
  return windowWidth >= DESKTOP_FROM_WIDTH ? "desktop" : "handy";
}
