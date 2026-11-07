/** So viele Millisekunden hat ein Jahr im Mittel (mit Schaltjahren). */
const MILLIS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

/**
 * Ein Datum als Jahr mit Nachkommastellen (1. Juli mittags ≈ ,5): So rechnet die Zeitleiste, bis
 * wohin „heute“ reicht. Lebt in `ui/`, weil die Domäne keine Uhr kennt.
 */
export function yearOfDate(date: Date): number {
  const startOfYear = new Date(date.getFullYear(), 0, 1);
  return date.getFullYear() + (date.getTime() - startOfYear.getTime()) / MILLIS_PER_YEAR;
}
