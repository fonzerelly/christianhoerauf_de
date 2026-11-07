import type { Station, Stations } from "../cv/stations";
import { itemAt, lastOf } from "../lists";

/** Eine Station der Linie als Abschnitt: von ihrem Beginn bis zum Beginn der nächsten (in Jahren). */
export interface Section {
  readonly station: Station;
  readonly from: number;
  readonly to: number;
  /** So breit muss der Abschnitt mindestens sein: die Breite seiner Beschriftung samt Luft. */
  readonly minWidth: number;
}

/** Ein Abschnitt an seinem Platz: `x` und `width` in Pixeln ab dem Anfang der Zeitleiste. */
export interface LaidSection extends Section {
  readonly x: number;
  readonly width: number;
}

/** Ein Engagement über der Linie: wo es beginnt und wie breit seine Beschriftung höchstens sein darf. */
export interface PlacedEngagement {
  readonly station: Station;
  readonly left: number;
  readonly maxLabelWidth: number;
}

/** Die aufgeklappte Zeitleiste, fertig gelegt. */
export interface ExpandedLayout {
  readonly sections: readonly LaidSection[];
  /** Wo die Linie endet; dahinter steht „heute“. */
  readonly lineEnd: number;
  /** Die Breite des ganzen Inhalts, „heute“ eingeschlossen. */
  readonly contentWidth: number;
  readonly engagements: readonly PlacedEngagement[];
}

export interface ExpandedOptions {
  /** So breit ist der sichtbare Bereich der Zeitleiste. */
  readonly availableWidth: number;
  /** Weniger Pixel je Jahr gibt es nie (sonst kleben kurze Stationen zusammen). */
  readonly minPixelsPerYear: number;
  /** Platz hinter dem Ende der Linie für „heute“. */
  readonly todaySpace: number;
  /** Abstand zwischen einer Beschriftung und der nächsten. */
  readonly labelAir: number;
  /** So schmal wird die Beschriftung eines Engagements höchstens (dann mit „…“ gekürzt). */
  readonly minEngagementWidth: number;
}

/** Abschnitte mögen nie ganz ohne Dauer sein, sonst teilt die Rechnung durch null. */
const SHORTEST_DURATION = 0.01;
/** So oft wird nachgerechnet, wenn Abschnitte auf ihre Mindestbreite geklemmt werden. */
const ROUNDS = 6;

function durationOf(section: Section): number {
  return Math.max(SHORTEST_DURATION, section.to - section.from);
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/**
 * Die Stationen der Linie als Abschnitte: jede bis zum Beginn der nächsten, die letzte bis
 * `today`. `minWidths` gehört in derselben Reihenfolge zu den Stationen (gleich viele).
 */
export function sectionsOf(
  mainTrack: readonly Station[],
  minWidths: readonly number[],
  today: number,
): Section[] {
  return mainTrack.map((station, index) => ({
    station,
    from: station.from,
    to: mainTrack[index + 1]?.from ?? today,
    minWidth: itemAt(minWidths, index),
  }));
}

/**
 * Pixel je Jahr, so dass die Abschnitte zusammen `width` füllen und keiner schmaler als seine
 * Mindestbreite wird. Abschnitte, die auf die Mindestbreite geklemmt werden, nehmen den übrigen
 * den Platz weg; deshalb wird einige Male nachgerechnet. Passen nicht einmal die Mindestbreiten,
 * bleibt es beim letzten Wert (dann ist die Zeitleiste breiter als der Platz und wird verschoben).
 */
export function pixelsPerYear(sections: readonly Section[], width: number): number {
  let perYear = width / sum(sections.map(durationOf));
  for (let round = 0; round < ROUNDS; round++) {
    const clamped = sections.filter((section) => durationOf(section) * perYear < section.minWidth);
    const free = sections.filter((section) => !clamped.includes(section));
    const freeWidth = width - sum(clamped.map(({ minWidth }) => minWidth));
    const freeDuration = sum(free.map(durationOf));
    if (freeDuration <= 0 || freeWidth <= 0) break;
    perYear = freeWidth / freeDuration;
  }
  return perYear;
}

/** Legt die Abschnitte nebeneinander, jeden so breit wie seine Dauer, aber nie schmaler als nötig. */
export function layOut(sections: readonly Section[], perYear: number): LaidSection[] {
  let x = 0;
  return sections.map((section) => {
    const width = Math.max(section.minWidth, (section.to - section.from) * perYear);
    const laid = { ...section, x, width };
    x += width;
    return laid;
  });
}

/**
 * Wo ein Zeitpunkt liegt: anteilig in seinem Abschnitt, damit Engagements über der richtigen Stelle
 * stehen, auch wenn eine Station verbreitert ist. Davor: am Anfang; danach: am Ende.
 */
export function xForYear(year: number, laid: readonly LaidSection[]): number {
  for (const section of laid) {
    if (year <= section.from) return section.x;
    if (year <= section.to) {
      return section.x + ((year - section.from) / (section.to - section.from)) * section.width;
    }
  }
  const last = laid.at(-1);
  return last === undefined ? 0 : last.x + last.width;
}

/**
 * Legt die aufgeklappte Zeitleiste (Q45, Q47): Der Beruf füllt die verfügbare Breite ohne den Platz
 * für „heute“; was davor war, kommt im selben Maßstab links dazu (und wird verschoben). Nie weniger
 * als `minPixelsPerYear`. Jedes Engagement steht beim Jahr seines Beginns; seine Beschriftung darf
 * bis kurz vor das nächste reichen, das letzte bis zum Ende des Inhalts, mindestens aber
 * `minEngagementWidth` breit sein.
 */
export function layOutExpanded(
  stations: Stations,
  minWidths: readonly number[],
  options: ExpandedOptions,
  today: number,
): ExpandedLayout {
  const all = sectionsOf(stations.mainTrack, minWidths, today);
  const career = all.filter(({ station }) => station.section === "beruf");
  const perYear = Math.max(
    options.minPixelsPerYear,
    pixelsPerYear(career, options.availableWidth - options.todaySpace),
  );
  const sections = layOut(all, perYear);
  const lineEnd = sections.length === 0 ? 0 : lastOf(sections).x + lastOf(sections).width;
  const contentWidth = lineEnd + options.todaySpace;

  const starts = stations.engagements.map(({ from }) => xForYear(from, sections));
  const engagements = stations.engagements.map((station, index) => {
    const left = itemAt(starts, index);
    const roomUntil = starts[index + 1] ?? contentWidth;
    const maxLabelWidth = Math.max(options.minEngagementWidth, roomUntil - left - options.labelAir);
    return { station, left, maxLabelWidth };
  });
  return { sections, lineEnd, contentWidth, engagements };
}
