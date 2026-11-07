/** Ein Zeitraum aus dem Lebenslauf, in Jahren mit Nachkommastellen (2020,75 = Anfang Oktober 2020). */
export interface TimeSpan {
  readonly from: number;
  readonly to: number;
}

const MONTHS_PER_YEAR = 12;
/** Ein Ende ohne Monat liegt irgendwann im Jahr; es gilt die Jahresmitte. */
const MIDDLE_OF_YEAR = 0.5;

/**
 * Ein Zeitpunkt aus dem Lebenslauf als Jahr mit Nachkommastellen: „10/2020“, „2014“ oder „heute“
 * (`today`, ebenfalls als Jahr). Ein Beginn liegt am Anfang des Monats bzw. Jahres, ein Ende am
 * Ende des Monats bzw. in der Jahresmitte. Unlesbares: `undefined`.
 */
export function yearOf(part: string, edge: "start" | "end", today: number): number | undefined {
  if (part === "heute") return today;

  const withMonth = /^(\d{1,2})\/(\d{4})$/.exec(part);
  if (withMonth !== null) {
    const month = Number(withMonth[1]);
    if (month < 1 || month > MONTHS_PER_YEAR) return undefined;
    const monthsBefore = edge === "end" ? month : month - 1;
    return Number(withMonth[2]) + monthsBefore / MONTHS_PER_YEAR;
  }

  const yearOnly = /^(\d{4})$/.exec(part);
  if (yearOnly !== null) return Number(yearOnly[1]) + (edge === "end" ? MIDDLE_OF_YEAR : 0);
  return undefined;
}

/**
 * Ein Zeitraum wie „2011 – 2014“ oder „10/2020 – heute“ (Gedanken- oder Bindestrich); ein
 * einzelner Zeitpunkt („2014“) ist Beginn und Ende zugleich. Unlesbar: `undefined`.
 */
export function timeSpanOf(text: string, today: number): TimeSpan | undefined {
  const [start = "", end = start] = text.split(/\s*[–-]\s*/).map((part) => part.trim());
  const from = yearOf(start, "start", today);
  const to = yearOf(end, "end", today);
  return from === undefined || to === undefined ? undefined : { from, to };
}
