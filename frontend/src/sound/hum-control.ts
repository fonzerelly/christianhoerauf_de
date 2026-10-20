import type { HumSound, HumTuning } from "./hum-sound";

/** Woher die Steuerung die wandernden Werte bekommt (`HumDrift`). */
export interface HumWandering {
  readonly current: HumTuning;
  advance(seconds: number): HumTuning | undefined;
}

/**
 * Steuert das Brummen: Der Besucher schaltet es an und aus, es wandert langsam in Frequenz und
 * Lautstärke und verstummt, solange eine Bildstörung läuft oder die Seite im Hintergrund liegt.
 */
export class HumControl {
  private on = false;
  private isGlitching = false;
  private isHidden = false;
  /** Was dem Ton zuletzt über das Verstummen gesagt wurde; so wird nur eine Änderung gemeldet. */
  private reportedMuted: boolean | undefined;

  public constructor(
    private readonly sound: HumSound,
    private readonly wandering: HumWandering,
  ) {}

  /** Ist das Brummen eingeschaltet? Beim Laden nicht. */
  public get isOn(): boolean {
    return this.on;
  }

  /** Schaltet das Brummen um und sagt, ob es jetzt an ist. */
  public toggle(): boolean {
    this.on = !this.on;
    if (this.on) {
      this.sound.start();
      this.sound.tune(this.wandering.current);
      this.reportedMuted = undefined;
      this.reportMuted();
    } else {
      this.sound.stop();
    }
    return this.on;
  }

  /** Ein Bild lang weiter: lässt das Brummen wandern und verstummen, solange `isGlitching`. */
  public update(seconds: number, isGlitching: boolean): void {
    this.isGlitching = isGlitching;
    if (!this.on) return;

    const target = this.wandering.advance(seconds);
    if (target !== undefined) this.sound.tune(target);
    this.reportMuted();
  }

  /** Die Seite geht in den Hintergrund oder kommt zurück. */
  public pageVisibilityChanged(isVisible: boolean): void {
    this.isHidden = !isVisible;
    if (this.on) this.reportMuted();
  }

  private reportMuted(): void {
    const isMuted = this.isGlitching || this.isHidden;
    if (isMuted === this.reportedMuted) return;
    this.reportedMuted = isMuted;
    this.sound.mute(isMuted);
  }
}
