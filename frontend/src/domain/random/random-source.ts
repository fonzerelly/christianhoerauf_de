/**
 * Quelle für Zufallszahlen. Der fachliche Kern zieht Zufall nur hierüber, nie aus `Math.random`.
 * So bleibt ein Labyrinth aus seinem Startwert reproduzierbar.
 */
export interface RandomSource {
  /** Die nächste Zufallszahl, mindestens 0 und kleiner als 1. */
  next(): number;
}
