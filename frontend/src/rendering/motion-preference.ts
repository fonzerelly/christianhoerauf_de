/** Wünscht der Besucher weniger Bewegung (`prefers-reduced-motion`)? */
export interface MotionPreference {
  readonly isReduced: boolean;
}

/**
 * Liest den Wunsch aus einer Medienabfrage des Browsers (`matchMedia`). Deren `matches` ist
 * lebendig: Ändert der Besucher die Einstellung, während die Seite offen ist, gilt sie sofort.
 */
export class MediaQueryMotionPreference implements MotionPreference {
  public constructor(private readonly query: { readonly matches: boolean }) {}

  public get isReduced(): boolean {
    return this.query.matches;
  }
}
