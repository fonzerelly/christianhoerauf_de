import type { Phase, Playback } from "../animation/playback-view";
import type { MazePage } from "../domain/pages/maze-page-generator";
import type { Renderer } from "../rendering/renderer";
import type { StageLayout } from "../rendering/stage-layout";
import { runInTasks } from "./step-runner";
import type { ScheduleTask } from "./step-runner";

export interface StageParts {
  readonly renderer: Renderer;
  /** Misst die Bühne und teilt sie ein. */
  readonly measure: () => StageLayout;
  /** Baut den Ablauf für eine Einteilung der Bühne; `firstSeed` ist der Startwert der ersten Antwort. */
  readonly createPlayback: (layout: StageLayout, firstSeed: number) => Playback;
  /** Der Startwert der Begrüßung. */
  readonly baseSeed: number;
  /** Zeigt den Abschnitt der Animation an (`data-phase`). */
  readonly phaseDisplay: { show(phase: Phase): void };
  /** Reiht Aufgaben ein, in denen die Wände der nächsten Seite vorab gezeichnet werden. */
  readonly scheduleTask: ScheduleTask;
  /** Das Brummen: bekommt in jedem Bild die vergangene Zeit und ob gerade eine Bildstörung läuft. */
  readonly hum: { update(seconds: number, isGlitching: boolean): void };
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
  /** Die nächste Seite, deren Wände schon vorab gezeichnet werden (oder wurden). */
  private nextPageInPreparation: MazePage | undefined;

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
    this.parts.phaseDisplay.show(this.playback.phase);
    const isAnimating = this.playback.isAnimating;
    if (isAnimating || this.wasAnimating || this.parts.renderer.isGlitching || this.needsDraw) {
      this.parts.renderer.draw(this.playback, seconds);
    }
    // Erst nach dem Zeichnen: Eine Bildstörung kann erst in diesem Bild begonnen haben.
    this.parts.hum.update(seconds, this.parts.renderer.isGlitching);
    this.wasAnimating = isAnimating;
    this.needsDraw = false;
    this.prepareNextPage();
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
    this.nextPageInPreparation = undefined;
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
    this.nextPageInPreparation = undefined;
  }

  /**
   * Gibt es eine neue nächste Seite, lässt die Bühne deren Wände vorab zeichnen: in eigenen,
   * kleinen Aufgaben, damit das Bild nicht stockt. Sie werden erst beim Weiterschieben gebraucht.
   */
  private prepareNextPage(): void {
    const next = this.playback.nextPage;
    if (next === undefined || next === this.nextPageInPreparation) return;

    this.nextPageInPreparation = next;
    void runInTasks(this.parts.renderer.prepare(next), this.parts.scheduleTask);
  }

  private lastReply(): Promise<string> | undefined {
    return this.lastText === undefined ? undefined : Promise.resolve(this.lastText);
  }
}
