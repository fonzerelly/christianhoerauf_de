/** So lange muss die Größe der Bühne ruhig bleiben, bevor auf eine Änderung reagiert wird. */
const SETTLE_MILLIS = 300;

export interface StageSizeWatcherParts {
  /** Die Bühne, deren Breite beobachtet wird. */
  readonly stage: { readonly clientWidth: number };
  /** Für welche Größe der Bühne zuletzt gebaut wurde. */
  readonly builtFor: () => { width: number; height: number };
  /** Baut für die neue Größe neu. */
  readonly rebuild: () => void;
  /** Ruft `callback` nach `millis` Millisekunden; die Rückgabe bricht den Aufruf ab. */
  readonly delay: (callback: () => void, millis: number) => () => void;
}

/**
 * Beobachtet die Breite der Bühne und baut neu, wenn sie sich wirklich geändert hat (Handy
 * gedreht, Fenster gezogen). Die Höhe zählt nicht: Sie ergibt sich aus Reihen und Zellgröße
 * (ADR 0007). Bildschirmtastatur und Adressleiste am Handy lösen deshalb nichts aus.
 *
 * Reagiert wird erst, wenn die Größe 0,3 Sekunden ruhig war: Beim Ziehen am Fenster ändert sie
 * sich oft mehrmals hintereinander.
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
    const { stage, builtFor, rebuild } = this.parts;
    if (stage.clientWidth !== builtFor().width) rebuild();
  }
}
