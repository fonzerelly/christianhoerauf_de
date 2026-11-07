import type { Cv, Stations } from "../../domain/cv/stations";
import { stationsOf } from "../../domain/cv/stations";

/** Was `Timeline` von der Ansicht braucht (`TimelineView`). */
export interface TimelineDisplay {
  showLoading(): void;
  showError(onRetry: () => void): void;
  showStations(stations: Stations): void;
}

/**
 * Die Zeitleiste als Ablauf: lädt den Lebenslauf zur Laufzeit (Q23), zeigt währenddessen „wird
 * geladen“, dann die Stationen; scheitert es, den Fehler mit „Nochmal versuchen“, das neu lädt
 * (Q35). Wird die Seite anders breit, zeichnet `refresh` die Stationen neu, ohne neu zu laden.
 */
export class Timeline {
  private stations: Stations | undefined;

  public constructor(
    private readonly source: { load(): Promise<Cv> },
    private readonly view: TimelineDisplay,
    /** Das heutige Datum als Jahr mit Nachkommastellen (bis wann „heute“ reicht). */
    private readonly today: number,
  ) {}

  public load(): void {
    this.view.showLoading();
    this.source.load().then(
      (cv) => {
        this.stations = stationsOf(cv, this.today);
        this.view.showStations(this.stations);
      },
      () => {
        this.view.showError(() => {
          this.load();
        });
      },
    );
  }

  /** Zeichnet die Stationen neu (die Breite hat sich geändert); ohne Stationen nichts. */
  public refresh(): void {
    if (this.stations !== undefined) this.view.showStations(this.stations);
  }
}
