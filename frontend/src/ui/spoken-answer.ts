import { withoutBreakMarks } from "../domain/text/break-marks";

/**
 * Der unsichtbare Bereich mit `aria-live="polite"`: Das Canvas ist für Screenreader leer, deshalb
 * steht hier jede Antwort zusätzlich als Text. Es ist der Originaltext, nicht der aufbereitete
 * (Großbuchstaben, Ersatzglyphen); nur die Trennstellen-Zeichen fehlen.
 */
export class SpokenAnswer {
  public constructor(private readonly region: { textContent: string | null }) {}

  public show(text: string): void {
    this.region.textContent = withoutBreakMarks(text);
  }
}
