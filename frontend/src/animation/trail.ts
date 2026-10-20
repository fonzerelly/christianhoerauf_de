/** Die Helligkeit der Leuchtspur wird in so viele Stufen eingeteilt (0 bis 16). */
export const BRIGHTNESS_LEVELS = 16;

export interface TrailSettings {
  readonly holdSeconds: number;
  readonly fadeSeconds: number;
}

/**
 * Die Leuchtspur: merkt sich, wann der Lichtpunkt jedes Wegstück fertig gelaufen ist, und
 * errechnet daraus, wie hell es noch leuchtet. Ein Wegstück leuchtet erst `holdSeconds` lang voll
 * und blendet dann innerhalb von `fadeSeconds` aus. Wegstücke gleicher Stufe lassen sich
 * gemeinsam zeichnen, das spart dem Renderer Arbeit.
 */
export class Trail {
  private walkedAt: number[] = [];

  public constructor(private readonly settings: TrailSettings) {}

  /** Vergisst alle gelaufenen Wegstücke (der Lichtpunkt beginnt eine neue Seite). */
  public reset(): void {
    this.walkedAt = [];
  }

  /** Merkt für die Wegstücke `stepsDoneBefore + 1` bis `stepsDoneNow`, dass sie zur Uhrzeit `clock` fertig wurden. */
  public markWalked(stepsDoneBefore: number, stepsDoneNow: number, clock: number): void {
    for (let step = stepsDoneBefore + 1; step <= stepsDoneNow; step++) {
      this.walkedAt[step] = clock;
    }
  }

  /**
   * Die Helligkeitsstufe eines Wegstücks zur Uhrzeit `clock`: `BRIGHTNESS_LEVELS` solange es
   * leuchtet (oder noch gelaufen wird), 0 wenn es verglommen ist.
   */
  public levelOf(step: number, clock: number): number {
    const walkedAt = this.walkedAt[step];
    if (walkedAt === undefined) return BRIGHTNESS_LEVELS;

    const secondsFading = clock - walkedAt - this.settings.holdSeconds;
    if (secondsFading <= 0) return BRIGHTNESS_LEVELS;

    const fadedPart = this.settings.fadeSeconds > 0 ? secondsFading / this.settings.fadeSeconds : 1;
    return Math.ceil(Math.max(0, 1 - fadedPart) * BRIGHTNESS_LEVELS);
  }

  /**
   * Das erste Wegstück, das noch zu sehen ist; alle davor sind verglommen und müssen beim
   * Zeichnen nicht angesehen werden. Ist alles verglommen, kommt der Schritt hinter dem letzten
   * gelaufenen.
   */
  public firstGlowingStep(stepsDone: number, clock: number): number {
    const lifetime = this.settings.holdSeconds + this.settings.fadeSeconds;
    let step = 1;
    while (step <= stepsDone && clock - (this.walkedAt[step] ?? clock) > lifetime) step++;
    return step;
  }
}
