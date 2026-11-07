import { timeSpanOf } from "./time-span";

/** Ein Eintrag des Lebenslaufs (von `/lebenslauf`); `time` fehlt etwa bei Projekten. */
export interface CvEntry {
  readonly time?: string;
  readonly title: string;
  readonly organization?: string;
  readonly bulletPoints: readonly string[];
}

/** Der Lebenslauf: Abschnitte wie „beruf“, „studium“, „lehre“ mit ihren Einträgen. */
export interface Cv {
  readonly sections: readonly { readonly name: string; readonly entries: readonly CvEntry[] }[];
}

/** Ein datierter Eintrag, gelesen: mit Abschnitt, Zeitraum (Jahre) und Nummer nach Beginn. */
export interface Station {
  readonly id: number;
  readonly section: string;
  /** Der Zeitraum, wie er im Lebenslauf steht („11/2014 – 09/2020“). */
  readonly time: string;
  readonly title: string;
  /** Nur wenn es ein Name ist (groß geschrieben); „ehrenamtlich“ ist keiner. */
  readonly organization?: string;
  readonly bulletPoints: readonly string[];
  readonly from: number;
  readonly to: number;
}

/**
 * Die Stationen der Zeitleiste: auf der Linie (`mainTrack`) der Beruf und alles, was vor dem
 * ersten Beruf endete (Schule, Studium …); daneben die Engagements, die neben dem Beruf liefen
 * (Lehre, Ehrenamt, berufsbegleitendes Studium).
 */
export interface Stations {
  readonly careerStart: number;
  readonly mainTrack: readonly Station[];
  readonly engagements: readonly Station[];
}

/** Eine Einstiegsfrage im Stationsmenü: was der Knopf zeigt und was ins Fragefeld kommt. */
export interface EntryQuestion {
  readonly label: string;
  readonly question: string;
}

/** Der Abschnitt des Lebenslaufs mit dem Beruf. */
const CAREER_SECTION = "beruf";
/** So knapp darf etwas nach dem Berufsbeginn enden und gilt doch als „davor“ (Rundung der Monate). */
const BEFORE_CAREER_TOLERANCE = 0.01;
/** Rechtsformen, die im Kurznamen wegfallen („TeamBank AG“ → „TeamBank“). */
const LEGAL_FORM = / (Software AG|Automotive GmbH|GmbH|AG)$/;

/** Eine Organisation, die klein geschrieben ist („ehrenamtlich“), ist kein Name. */
function nameOf(organization: string | undefined): string | undefined {
  return organization !== undefined && /^[A-ZÄÖÜ]/.test(organization) ? organization : undefined;
}

/**
 * Liest alle datierten Einträge, sortiert sie nach Beginn, nummeriert sie und verteilt sie auf
 * Linie und Engagements (siehe `Stations`). Einträge ohne oder mit unlesbarem Zeitraum fallen weg
 * (Projekte, Vorträge). Ohne Beruf gilt der erste Eintrag als Beginn, ohne Einträge `today`.
 */
export function stationsOf(cv: Cv, today: number): Stations {
  const dated = cv.sections.flatMap(({ name, entries }) =>
    entries.flatMap((entry) => {
      const span = entry.time === undefined ? undefined : timeSpanOf(entry.time, today);
      if (entry.time === undefined || span === undefined) return [];
      const organization = nameOf(entry.organization);
      return [
        {
          section: name,
          time: entry.time,
          title: entry.title,
          ...(organization === undefined ? {} : { organization }),
          bulletPoints: entry.bulletPoints,
          ...span,
        },
      ];
    }),
  );
  const all: Station[] = dated
    .sort((first, second) => first.from - second.from)
    .map((station, id) => ({ id, ...station }));

  const career = all.filter(({ section }) => section === CAREER_SECTION);
  const careerStart = career[0]?.from ?? all[0]?.from ?? today;
  const isBeforeCareer = (station: Station): boolean =>
    station.to <= careerStart + BEFORE_CAREER_TOLERANCE;
  const outsideCareer = all.filter(({ section }) => section !== CAREER_SECTION);
  return {
    careerStart,
    mainTrack: [...outsideCareer.filter(isBeforeCareer), ...career],
    engagements: outsideCareer.filter((station) => !isBeforeCareer(station)),
  };
}

/** Kurzer Name für die Zeile „Jahr Name“: die Organisation ohne Rechtsform, sonst der Titel. */
export function shortName(station: Station): string {
  return (station.organization ?? station.title).replace(LEGAL_FORM, "");
}

/** Das Jahr, mit dem eine Station beschriftet ist: das ihres Beginns („11/2014 – …“ → „2014“). */
export function yearLabel(station: Station): string {
  return String(Math.floor(station.from));
}

/**
 * Die Beschriftung eines Engagements über der Linie: Titel bis zum ersten Komma, dann die
 * Organisation („Mathematik, berufsbegleitend“ bei „Fernhochschule“ → „Mathematik · Fernhochschule“).
 */
export function engagementLabel(station: Station): string {
  const title = station.title.replace(/,.*$/s, "");
  return station.organization === undefined ? title : `${title} · ${station.organization}`;
}

/**
 * Die Einstiegsfragen einer Station (Q21): eine allgemeine („Was hat Chris bei … gemacht?“, ohne
 * Organisation „in der Zeit „Titel““), dann je Stichpunkt eine („Erzähl mir mehr über „…“ bei …“).
 */
export function entryQuestions(station: Station): EntryQuestion[] {
  const { organization, title } = station;
  const place = organization === undefined ? `in der Zeit „${title}“` : `bei ${organization}`;
  const general = `Was hat Chris ${place} gemacht?`;
  const about = (point: string): string =>
    organization === undefined
      ? `Erzähl mir mehr über „${point}“ (${title}).`
      : `Erzähl mir mehr über „${point}“ bei ${organization}.`;
  return [
    { label: general, question: general },
    ...station.bulletPoints.map((point) => ({ label: point, question: about(point) })),
  ];
}
