/**
 * Wie hell der wartende Lichtpunkt gerade pulsiert, von 0 (am dunkelsten) bis 1 (am hellsten).
 * Der Verlauf ist eine Kosinuskurve und beginnt hell; eine volle Schwingung dauert
 * `periodSeconds`.
 */
export function pulseOf(secondsResting: number, periodSeconds: number): number {
  return (1 + Math.cos((2 * Math.PI * secondsResting) / periodSeconds)) / 2;
}
