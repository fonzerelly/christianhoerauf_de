import type { StageLayout } from "../rendering/stage-layout";

/** Ein Element, dessen Stil sich setzen lässt (ein Ausschnitt von `HTMLElement`). */
export interface StyledElement {
  readonly style: { height: string; setProperty(name: string, value: string): void };
}

/**
 * Überträgt die Einteilung der Bühne auf die Seite: Die Bühne wird so hoch wie ihre Reihen
 * (ADR 0007), und die Seite bekommt Anfang und Breite des Labyrinths als CSS-Variablen
 * `--maze-left` und `--maze-width`. Das Labyrinth besteht aus ganzen Zellen und ist deshalb etwas
 * schmaler als die Bühne; Zeitleiste und Fragefeld stehen damit genau bündig darunter.
 */
export function applyStageLayout(
  stage: StyledElement,
  page: StyledElement,
  layout: StageLayout,
): void {
  stage.style.height = `${String(layout.viewHeight)}px`;
  page.style.setProperty("--maze-left", `${String(layout.offsetX)}px`);
  page.style.setProperty("--maze-width", `${String(layout.columns * layout.cellSize)}px`);
}
