/** So lange muss die Größe der Bühne ruhig bleiben, bevor auf eine Änderung reagiert wird. */
const SETTLE_MILLIS = 300;

export interface StageSizeWatcherParts {
  /** Die Bühne, deren Größe beobachtet wird. */
  readonly stage: { readonly clientWidth: number; readonly clientHeight: number };
  /** Für welche Größe der Bühne zuletzt gebaut wurde. */
  readonly builtFor: () => { width: number; height: number };
  /** Hat gerade das Fragefeld den Fokus? Dann ist am Handy vermutlich die Bildschirmtastatur offen. */
  readonly isTyping: () => boolean;
  /** Baut für die neue Größe neu. */
  readonly rebuild: () => void;
  /** Ruft `callback` nach `millis` Millisekunden; die Rückgabe bricht den Aufruf ab. */
  readonly delay: (callback: () => void, millis: number) => () => void;
}

/**
 * Beobachtet die Größe der Bühne und baut neu, wenn sie sich wirklich geändert hat.
 *
 * Die Falle am Handy: Die Bildschirmtastatur macht das Fenster niedriger. Würde darauf neu
 * gebaut, begänne die Animation bei jedem Antippen des Fragefelds von vorn. Deshalb:
 * - andere Breite (Handy gedreht, Fenster gezogen) → neu bauen
 * - nur andere Höhe, während getippt wird → nichts tun (das Bild bleibt stehen und wird unten
 *   abgeschnitten)
 * - nur andere Höhe, ohne dass getippt wird → neu bauen
 *
 * Reagiert wird erst, wenn die Größe 0,3 Sekunden ruhig war: Beim Aus- und Einfahren der
 * Tastatur ändert sie sich oft mehrmals hintereinander.
 */
export class StageSizeWatcher {
  private cancelWaiting: (() => void) | undefined;

  public constructor(private readonly parts: StageSizeWatcherParts) {}

  /** Die Größe der Bühne hat sich vielleicht geändert (Fenster-Ereignis, Größenbeobachter). */
  public notifyChange(): void {
    this.cancelWaiting?.();
    this.cancelWaiting = this.parts.delay(() => {
      this.check();
    }, SETTLE_MILLIS);
  }

  private check(): void {
    const { stage, builtFor, isTyping, rebuild } = this.parts;
    const built = builtFor();
    const widthChanged = stage.clientWidth !== built.width;
    const heightChanged = stage.clientHeight !== built.height;
    if (widthChanged || (heightChanged && !isTyping())) rebuild();
  }
}
