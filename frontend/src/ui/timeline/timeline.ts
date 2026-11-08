import type { Cv, Stations } from "../../domain/cv/stations";
import { stationsOf } from "../../domain/cv/stations";

/** Was `Timeline` von der Ansicht braucht (`TimelineView`). */
export interface TimelineDisplay {
  showLoading(): void;
  showError(onRetry: () => void): void;
  showStations(
    stations: Stations,
    display: { readonly expanded: boolean; readonly onToggle: () => void },
  ): void;
}

/** Was `Timeline` vom Übergang braucht (`FoldTransition`). */
export interface FoldTransitionLike {
  run(render: () => void): void;
  finish(): void;
}

/**
 * Die Zeitleiste als Ablauf: lädt den Lebenslauf zur Laufzeit (Q23), zeigt währenddessen „wird
 * geladen“, dann die Stationen; scheitert es, den Fehler mit „Nochmal versuchen“, das neu lädt
 * (Q35). Sie beginnt aufgeklappt; der Klappknopf klappt zu und auf, und sobald jemand fragt,
 * klappt sie zu (Q43), auch wenn die Stationen dann noch laden. Das Klappen spielt den Übergang
 * (`FoldTransition`). Wird die Seite anders breit, zeichnet `refresh` neu, ohne neu zu laden.
 */
export class Timeline {
  private stations: Stations | undefined;
  private expanded = true;

  public constructor(
    private readonly source: { load(): Promise<Cv> },
    private readonly view: TimelineDisplay,
    /** Das heutige Datum als Jahr mit Nachkommastellen (bis wann „heute“ reicht). */
    private readonly today: number,
    /** Der Übergang beim Klappen (`FoldTransition`). */
    private readonly transition: FoldTransitionLike,
  ) {}

  public load(): void {
    this.view.showLoading();
    this.source.load().then(
      (cv) => {
        this.stations = stationsOf(cv, this.today);
        this.draw();
      },
      () => {
        this.view.showError(() => {
          this.load();
        });
      },
    );
  }

  /** Klappt zu (jemand hat gefragt). Ist sie schon zu, passiert nichts. */
  public collapse(): void {
    if (this.expanded) this.setExpanded(false);
  }

  /** Zeichnet die Stationen neu (andere Breite); ein laufender Übergang endet sofort. */
  public refresh(): void {
    this.transition.finish();
    this.draw();
  }

  /** Zeigt die Stationen im aktuellen Zustand; ohne Stationen nichts. */
  private draw(): void {
    if (this.stations === undefined) return;
    this.view.showStations(this.stations, {
      expanded: this.expanded,
      onToggle: () => {
        this.setExpanded(!this.expanded);
      },
    });
  }

  /** Klappt auf oder zu, mit Übergang. */
  private setExpanded(expanded: boolean): void {
    this.expanded = expanded;
    this.transition.run(() => {
      this.draw();
    });
  }
}
