import type { Phase } from "../animation/playback-view";

/**
 * Zeigt, in welchem Abschnitt die Animation ist, als Attribut `data-phase` an der Bühne. Besucher
 * sehen davon nichts; die Bildtests warten damit auf den Haltepunkt oder das Weiterschieben,
 * statt Sekunden zu raten.
 */
export class PhaseIndicator {
  private shown: Phase | undefined;

  public constructor(private readonly element: { dataset: { phase?: string | undefined } }) {}

  public show(phase: Phase): void {
    if (phase === this.shown) return;
    this.shown = phase;
    this.element.dataset.phase = phase;
  }
}
