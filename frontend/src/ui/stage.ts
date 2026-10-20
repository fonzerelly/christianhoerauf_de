import type { Playback } from "../animation/playback-view";
import type { Renderer } from "../rendering/renderer";
import type { StageLayout } from "../rendering/stage-layout";

export interface StageParts {
  readonly renderer: Renderer;
  /** Misst die Bühne und teilt sie ein. */
  readonly measure: () => StageLayout;
  /** Baut den Ablauf für eine Einteilung der Bühne; `firstSeed` ist der Startwert der ersten Antwort. */
  readonly createPlayback: (layout: StageLayout, firstSeed: number) => Playback;
  /** Der Startwert der Begrüßung. */
  readonly baseSeed: number;
}

/**
 * Die Bühne: hält Renderer und Ablauf zusammen und weiß, wann ein Bild nötig ist und wann die
 * Bühne neu aufgebaut werden muss. Ändert sich die Größe der Bühne, entsteht ein neuer Ablauf,
 * der die aktuelle Antwort von vorn schreibt - mit dem Startwert, den sie auch bei einem frischen
 * Laden in dieser Größe hätte.
 */
export class Stage {
  private layout: StageLayout;
  private playback: Playback;
  /** Die Antwort, auf die noch gewartet wird. */
  private pending: Promise<string> | undefined;
  /** Der Text der zuletzt eingetroffenen Antwort. */
  private lastText: string | undefined;
  private needsDraw = true;
  private wasAnimating = false;

  public constructor(private readonly parts: StageParts) {
    this.layout = parts.measure();
    this.playback = parts.createPlayback(this.layout, parts.baseSeed);
  }

  /** Die Größe der Bühne in Pixeln, für die gebaut wurde. */
  public get builtFor(): { width: number; height: number } {
    return { width: this.layout.viewWidth, height: this.layout.viewHeight };
  }

  /**
   * Ein Bild: lässt die Animation `seconds` weiterlaufen und zeichnet - aber nur, wenn sich etwas
   * bewegt (oder eben bewegt hat), eine Bildstörung läuft oder etwas neu gezeichnet werden muss.
   */
  public tick(seconds: number): void {
    this.playback.advance(seconds);
    const isAnimating = this.playback.isAnimating;
    if (isAnimating || this.wasAnimating || this.parts.renderer.isGlitching || this.needsDraw) {
      this.parts.renderer.draw(this.playback, seconds);
    }
    this.wasAnimating = isAnimating;
    this.needsDraw = false;
  }

  /** Eine Frage wurde gestellt, `reply` liefert den Text der Antwort. */
  public show(reply: Promise<string>): void {
    this.pending = reply;
    void reply.then((text) => {
      if (this.pending !== reply) return; // inzwischen kam eine neuere Frage
      this.lastText = text;
      this.pending = undefined;
    });
    this.playback.request(reply);
  }

  /** Das Vorgezeichnete ist nicht mehr verlässlich (Seite war im Hintergrund): neu zeichnen. */
  public refresh(): void {
    this.parts.renderer.discardPreparedImages();
    this.needsDraw = true;
  }

  /**
   * Die Bühne hat eine andere Größe: neu messen, Renderer umstellen und die aktuelle Antwort in
   * einem neuen Ablauf von vorn schreiben. Wird noch auf eine Antwort gewartet, ist es diese.
   */
  public rebuild(): void {
    const written = this.playback.answersWritten;
    this.layout = this.parts.measure();
    this.parts.renderer.resize(this.layout);

    const reply = this.pending ?? this.lastReply();
    // Eine Antwort, auf die gewartet wird, bekäme die nächste Nummer; die letzte behält ihre.
    const number = this.pending === undefined ? Math.max(0, written - 1) : written;
    this.playback = this.parts.createPlayback(this.layout, this.parts.baseSeed + number);
    if (reply !== undefined) this.playback.request(reply);
    this.needsDraw = true;
    this.wasAnimating = false;
  }

  private lastReply(): Promise<string> | undefined {
    return this.lastText === undefined ? undefined : Promise.resolve(this.lastText);
  }
}
