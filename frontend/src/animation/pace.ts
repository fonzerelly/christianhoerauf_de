import type { StepKind } from "../domain/route/route-step";
import type { PlaybackSettings } from "./playback-settings";

/**
 * Wie viele Zellen pro Sekunde der Lichtpunkt auf einem Wegstück dieser Art läuft: in
 * Schriftwegen das eingestellte Tempo, überall sonst ein Vielfaches davon. Im Schnelldurchlauf
 * kommt der Rush-Faktor dazu.
 */
export function paceOf(kind: StepKind, isRushing: boolean, settings: PlaybackSettings): number {
  const normalPace =
    kind === "letter" ? settings.speed : settings.speed * settings.connectorSpeedFactor;
  return isRushing ? normalPace * settings.rushFactor : normalPace;
}
