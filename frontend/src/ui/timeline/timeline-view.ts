import type { Station, Stations } from "../../domain/cv/stations";
import { engagementLabel, yearLabel } from "../../domain/cv/stations";
import { itemAt } from "../../domain/lists";
import { layOutExpanded } from "../../domain/timeline/scale";
import type { ElementFactory, ElementLike } from "../dom-like";

/** Abstand zwischen einer Beschriftung und der nächsten. */
const LABEL_AIR = 12;
/** Platz hinter dem Ende der Linie für „heute“. */
const TODAY_SPACE = 64;
/** Wie weit „heute“ hinter dem Ende der Linie steht, und wie weit über ihr (zur Mitte der Schrift). */
const TODAY_OFFSET = { left: 10, top: 8 };
/** Höhe des Strichs eines Engagements über der Linie. */
const ENGAGEMENT_HEIGHT = 24;
/** So schmal wird die Beschriftung eines Engagements höchstens (dann mit „…“ gekürzt, CSS). */
const SMALLEST_ENGAGEMENT_LABEL = 40;
/** Abstand zwischen der Linie und dem Strich einer Station darunter, und unter den Stationen. */
const LINE_GAP = 2;
const BOTTOM_SPACE = 8;

export interface TimelineViewParts<Element extends ElementLike<Element>> {
  /** Legt Elemente an (im Browser `document`). */
  readonly document: ElementFactory<Element>;
  /** Der Platz der Zeitleiste auf der Seite (`#timeline`). */
  readonly container: Element;
  /** Breite bzw. Höhe eines Elements, wie es auf der Seite steht (`offsetWidth`, `offsetHeight`). */
  readonly measureWidth: (element: Element) => number;
  readonly measureHeight: (element: Element) => number;
  /** Sichtbare und ganze Breite des verschiebbaren Bereichs (`clientWidth`, `scrollWidth`). */
  readonly visibleWidth: (element: Element) => number;
  readonly scrollWidth: (element: Element) => number;
  /** Weniger Pixel je Jahr gibt es nie (Desktop 34, Handy 22). */
  readonly minPixelsPerYear: number;
  /** Das heutige Datum als Jahr mit Nachkommastellen. */
  readonly today: number;
  /** Verbindet Pfeile, Bildlaufleiste und Ziehen mit dem verschiebbaren Bereich (`ScrollControls`). */
  readonly connectScrolling: (elements: ScrollingElements<Element>) => void;
}

/** Die Elemente, mit denen sich die Zeitleiste verschieben lässt. */
export interface ScrollingElements<Element> {
  readonly frame: Element;
  readonly scroll: Element;
  readonly earlier: Element;
  readonly later: Element;
  readonly track: Element;
  readonly thumb: Element;
}

const px = (value: number): string => `${String(value)}px`;

/**
 * Die Zeitleiste auf der Seite (ADR 0007, Q45–Q47): beim Laden „Stationen werden geladen …“,
 * scheitert es, ein Satz und „Nochmal versuchen“ (Q35). Aufgeklappt stehen die Stationen groß
 * unter der Linie, nach Zeit gelegt und jede mindestens so breit wie ihre Beschriftung; die
 * Engagements stehen klein darüber, mit einem Strich an ihrem Beginn. Hinter der Linie „heute“;
 * beim Zeigen steht „heute“ am rechten Rand.
 *
 * Die Elemente kommen erst auf die Seite, weil sich ihre Breite erst dort messen lässt; danach
 * stellt `layOutExpanded` sie an ihren Platz.
 */
export class TimelineView<Element extends ElementLike<Element>> {
  public constructor(private readonly parts: TimelineViewParts<Element>) {}

  public showLoading(): void {
    this.show(this.element("p", "timeline-status", "Stationen werden geladen …"));
  }

  public showError(onRetry: () => void): void {
    const retry = this.element("button", "timeline-retry", "Nochmal versuchen");
    retry.setAttribute("type", "button");
    retry.addEventListener("click", onRetry);
    const status = this.element(
      "p",
      "timeline-status",
      "Die Stationen sind gerade nicht erreichbar.",
    );
    status.append(retry);
    this.show(status);
  }

  public showStations(stations: Stations): void {
    const { measureWidth, measureHeight, visibleWidth, scrollWidth } = this.parts;
    const content = this.element("div", "timeline-content");
    const axis = this.element("div", "timeline-axis");
    const today = this.element("span", "timeline-today", "heute");
    const stationBlocks = stations.mainTrack.map((station) => this.stationBlock(station));
    const engagementBlocks = stations.engagements.map((station) => this.engagementBlock(station));
    content.append(
      axis,
      ...stationBlocks.map(({ block }) => block),
      ...engagementBlocks.map(({ block }) => block),
      today,
    );
    // Rahmen (Raster im CSS):  [‹] [verschiebbarer Inhalt] [›]
    //                              [Bahn mit Griff        ]
    const scroll = this.element("div", "timeline-scroll");
    scroll.append(content);
    const earlier = this.arrow("earlier", "‹", "Früher");
    const later = this.arrow("later", "›", "Später");
    const thumb = this.element("div", "timeline-thumb");
    const track = this.element("div", "timeline-track");
    // Tastatur und Screenreader nehmen die Pfeile; die Bahn ist nur fürs Auge und die Maus.
    track.setAttribute("aria-hidden", "true");
    track.append(thumb);
    const bottomRow = this.element("div", "timeline-bottom");
    bottomRow.append(track);
    const frame = this.element("div", "timeline-frame");
    frame.append(earlier, scroll, later, bottomRow);
    this.show(frame);

    const layout = layOutExpanded(
      stations,
      stationBlocks.map(({ button }) => measureWidth(button) + LABEL_AIR),
      {
        availableWidth: visibleWidth(scroll),
        minPixelsPerYear: this.parts.minPixelsPerYear,
        todaySpace: TODAY_SPACE,
        labelAir: LABEL_AIR,
        minEngagementWidth: SMALLEST_ENGAGEMENT_LABEL,
      },
      this.parts.today,
    );

    const lineTop = engagementBlocks.length > 0 ? ENGAGEMENT_HEIGHT + LINE_GAP : 0;
    const stationTop = lineTop + LINE_GAP;
    stationBlocks.forEach(({ block }, index) => {
      const { x, width } = itemAt(layout.sections, index);
      this.place(block, { left: x, width, top: stationTop });
    });
    engagementBlocks.forEach(({ block, button }, index) => {
      const { left, maxLabelWidth } = itemAt(layout.engagements, index);
      this.place(block, { left, top: lineTop - ENGAGEMENT_HEIGHT, height: ENGAGEMENT_HEIGHT });
      button.style.setProperty("max-width", px(maxLabelWidth));
    });
    this.place(axis, { top: lineTop, width: layout.lineEnd });
    this.place(today, {
      left: layout.lineEnd + TODAY_OFFSET.left,
      top: lineTop - TODAY_OFFSET.top,
    });

    const bottom = Math.max(
      stationTop,
      ...stationBlocks.map(({ block }) => stationTop + measureHeight(block)),
    );
    this.place(content, { width: layout.contentWidth, height: bottom + BOTTOM_SPACE });
    scroll.scrollLeft = scrollWidth(scroll);
    this.parts.connectScrolling({ frame, scroll, earlier, later, track, thumb });
  }

  /** Ein Pfeil zum Verschieben: „‹“ (früher) links, „›“ (später) rechts. */
  private arrow(direction: "earlier" | "later", sign: string, label: string): Element {
    const arrow = this.element("button", `timeline-arrow ${direction}`, sign);
    arrow.setAttribute("type", "button");
    arrow.setAttribute("aria-label", label);
    return arrow;
  }

  /** Eine Station: ein Block unter der Linie mit einem Knopf aus Jahr, Organisation und Titel. */
  private stationBlock(station: Station): { block: Element; button: Element } {
    const button = this.button("timeline-station-button", station);
    button.append(this.element("span", "year", yearLabel(station)));
    if (station.organization !== undefined) {
      button.append(this.element("span", "organization", station.organization));
    }
    button.append(this.element("span", "title", station.title));
    const block = this.element("div", "timeline-station");
    block.append(button);
    return { block, button };
  }

  /**
   * Ein Engagement: ein Strich über der Linie mit einem kleinen Knopf daneben. Die Beschriftung
   * kann gekürzt sein; im Tooltip und für Screenreader steht sie ganz, mit dem Zeitraum.
   */
  private engagementBlock(station: Station): { block: Element; button: Element } {
    const label = engagementLabel(station);
    const button = this.button("timeline-engagement-button", station);
    button.textContent = label;
    button.setAttribute("title", `${station.time} · ${label}`);
    button.setAttribute("aria-label", `${label}, ${station.time}`);
    const block = this.element("div", "timeline-engagement");
    block.append(button);
    return { block, button };
  }

  /** Ein Knopf zu einer Station; `data-station` nennt sie (für Stationsmenü und Übergang). */
  private button(className: string, station: Station): Element {
    const button = this.element("button", className);
    button.setAttribute("type", "button");
    button.setAttribute("data-station", String(station.id));
    return button;
  }

  private element(tag: "p" | "button" | "div" | "span", className: string, text?: string): Element {
    const element = this.parts.document.createElement(tag);
    element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  private place(
    element: Element,
    box: { left?: number; top?: number; width?: number; height?: number },
  ): void {
    for (const [name, value] of Object.entries(box)) element.style.setProperty(name, px(value));
  }

  private show(content: Element): void {
    this.parts.container.hidden = false;
    this.parts.container.replaceChildren(content);
  }
}
