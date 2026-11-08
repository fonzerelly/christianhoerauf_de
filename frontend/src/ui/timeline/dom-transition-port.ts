import type { Rect, RunningAnimation, Snapshot, TransitionPort } from "./fold-transition";

/**
 * Diese Eigenschaften bekommt ein Abbild fest mit: Die Regeln im CSS hängen am Ort
 * (`.timeline-line .timeline-today`, `.timeline-station-button .year` …) und greifen auf der Ebene
 * darüber nicht mehr.
 */
const COPIED_STYLES = [
  "font-family",
  "font-size",
  "font-weight",
  "line-height",
  "letter-spacing",
  "color",
  "background-color",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "white-space",
  "text-overflow",
  "overflow",
  "text-align",
];

/** Der Schlüssel eines Eintrags für den Übergang: Station über ihre Nummer, sonst `data-transition`. */
function keyOf(element: HTMLElement): string | undefined {
  const station = element.dataset.station;
  return station === undefined ? element.dataset.transition : `station-${station}`;
}

/**
 * Das DOM für `FoldTransition`: misst und klont die Einträge der Zeitleiste, legt die Ebene über
 * sie und spielt Animationen mit der Web Animations API.
 *
 * Nur DOM-Aufrufe ohne eigene Entscheidungen; ohne Browser lässt sich das nicht prüfen. Die Datei
 * steht deshalb wie `main.ts` nicht in der Unit-Test-Abdeckung (vitest.config.ts); die Logik liegt
 * in `fold-transition.ts`, Anfang und Ende des Übergangs zeigen die Bildtests.
 */
export class DomTransitionPort implements TransitionPort<HTMLElement> {
  public constructor(
    private readonly container: HTMLElement,
    private readonly document: Document,
  ) {}

  public capture(): Snapshot<HTMLElement> | undefined {
    const scroll = this.scroll();
    if (scroll === undefined) return undefined;
    const entries = new Map<string, { rect: Rect; image: HTMLElement }>();
    for (const element of scroll.querySelectorAll<HTMLElement>(
      "[data-station], [data-transition]",
    )) {
      const key = keyOf(element);
      if (key !== undefined) {
        entries.set(key, { rect: element.getBoundingClientRect(), image: this.imageOf(element) });
      }
    }
    const content = scroll.querySelector<HTMLElement>(".timeline-content");
    return {
      height: this.container.offsetHeight,
      visible: scroll.getBoundingClientRect(),
      entries,
      skeleton:
        content === null
          ? undefined
          : { rect: content.getBoundingClientRect(), image: this.skeletonOf(content) },
    };
  }

  public openLayer(visible: Rect): HTMLElement {
    const layer = this.document.createElement("div");
    layer.className = "timeline-transition";
    layer.setAttribute("aria-hidden", "true");
    const view = this.document.defaultView;
    Object.assign(layer.style, {
      left: `${String(visible.left + (view?.scrollX ?? 0))}px`,
      top: `${String(visible.top + (view?.scrollY ?? 0))}px`,
      width: `${String(visible.width)}px`,
    });
    this.document.body.append(layer);
    return layer;
  }

  public put(layer: HTMLElement, image: HTMLElement, at: Rect): void {
    layer.append(image);
    this.placeOn(layer, image, at);
  }

  public wrapSkeleton(layer: HTMLElement, image: HTMLElement, at: Rect): HTMLElement {
    const wrapper = this.document.createElement("div");
    wrapper.className = "timeline-skeleton";
    layer.append(wrapper);
    wrapper.append(image);
    image.style.position = "absolute";
    this.placeOn(layer, image, at);
    return wrapper;
  }

  public animate(
    target: HTMLElement | "container",
    keyframes: Keyframe[],
    timing: KeyframeAnimationOptions,
  ): RunningAnimation {
    return (target === "container" ? this.container : target).animate(keyframes, timing);
  }

  public setRunning(running: boolean): void {
    this.container.classList.toggle("transitioning", running);
    const scroll = this.scroll();
    if (scroll !== undefined) scroll.style.visibility = running ? "hidden" : "";
  }

  public closeLayer(layer: HTMLElement): void {
    layer.remove();
  }

  private scroll(): HTMLElement | undefined {
    return this.container.querySelector<HTMLElement>(".timeline-scroll") ?? undefined;
  }

  /** Ein Abbild für die Ebene: gleicher Inhalt, gleiches Aussehen, keine Bedienung. */
  private imageOf(original: HTMLElement): HTMLElement {
    const style = getComputedStyle(original);
    const image = original.cloneNode(true) as HTMLElement;
    for (const name of COPIED_STYLES) image.style.setProperty(name, style.getPropertyValue(name));
    image.removeAttribute("id");
    image.tabIndex = -1;
    Object.assign(image.style, {
      position: "absolute",
      margin: "0",
      boxSizing: "border-box",
      border: "none",
    });
    return image;
  }

  /**
   * Das Gerippe: der Inhalt mit Linie und Strichen, die Texte nur unsichtbar (nicht entfernt: Sie
   * geben den Strichen der Stationen ihre Höhe).
   */
  private skeletonOf(content: HTMLElement): HTMLElement {
    const image = content.cloneNode(true) as HTMLElement;
    for (const text of image.querySelectorAll<HTMLElement>("button, .timeline-today")) {
      text.style.visibility = "hidden";
    }
    return image;
  }

  /** Stellt ein Element auf der Ebene an die Stelle `at` (Fensterkoordinaten). */
  private placeOn(layer: HTMLElement, element: HTMLElement, at: Rect): void {
    const origin = layer.getBoundingClientRect();
    Object.assign(element.style, {
      left: `${String(at.left - origin.left)}px`,
      top: `${String(at.top - origin.top)}px`,
      width: `${String(at.width)}px`,
      height: `${String(at.height)}px`,
    });
  }
}
