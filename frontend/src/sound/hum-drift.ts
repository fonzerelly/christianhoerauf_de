import type { RandomSource } from "../domain/random/random-source";
import type { HumSettings } from "./hum-settings";
import type { HumTuning } from "./hum-sound";

/** Das langsame, zufällige Wandern von Frequenz und Lautstärke des Brummens. */
export class HumDrift {
  private target: HumTuning;
  private secondsSinceTarget = 0;

  public constructor(
    private readonly random: RandomSource,
    private readonly settings: HumSettings,
  ) {
    this.target = {
      frequency: settings.humBaseHertz,
      level: (1 + settings.humMinLevel) / 2,
    };
  }

  /** Wohin das Brummen gerade wandert. Am Anfang: Grundton, mittlere Lautstärke. */
  public get current(): HumTuning {
    return this.target;
  }

  /** Lässt `seconds` vergehen. Ist es Zeit für ein neues Ziel, kommt es zurück, sonst `undefined`. */
  public advance(seconds: number): HumTuning | undefined {
    this.secondsSinceTarget += seconds;
    if (this.secondsSinceTarget < this.settings.humDriftSeconds) return undefined;

    this.secondsSinceTarget = 0;
    const { humBaseHertz, humDriftHertz, humMinLevel } = this.settings;
    this.target = {
      frequency: humBaseHertz + (this.random.next() - 0.5) * 2 * humDriftHertz,
      level: humMinLevel + this.random.next() * (1 - humMinLevel),
    };
    return this.target;
  }
}
