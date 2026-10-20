/**
 * Der Takt der Seite: In jedem Bild des Browsers (`requestAnimationFrame`) lässt er die Bühne um
 * die vergangene Zeit weiterlaufen.
 */
export class AnimationLoop {
  public constructor(
    private readonly stage: { tick(seconds: number): void; refresh(): void },
    private readonly timer: { secondsSinceLastFrame(): number; restart(): void },
    private readonly requestFrame: (callback: () => void) => void,
  ) {}

  public start(): void {
    this.requestFrame(() => {
      this.onFrame();
    });
  }

  /**
   * Die Seite geht in den Hintergrund oder kommt zurück. Die Zeitmessung beginnt neu, sonst zählte
   * die Pause als ein einziger sehr langer Schritt. Kommt die Seite zurück, wird alles Vorgezeichnete
   * neu erzeugt, falls der Browser es in der Pause verworfen hat.
   */
  public pageVisibilityChanged(isVisible: boolean): void {
    this.timer.restart();
    if (isVisible) this.stage.refresh();
  }

  private onFrame(): void {
    this.stage.tick(this.timer.secondsSinceLastFrame());
    this.start();
  }
}
