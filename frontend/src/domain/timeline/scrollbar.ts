/**
 * Die eigene Bildlaufleiste der Zeitleiste als Rechnung (die des Browsers ist ausgeblendet, weil
 * sie sich nicht bündig zwischen „‹“ und den Klappknopf legen lässt). Alle Maße in Pixeln.
 */
export interface ScrollView {
  /** Breite des ganzen Inhalts und des sichtbaren Bereichs. */
  readonly scrollWidth: number;
  readonly clientWidth: number;
  /** Breite der Bahn, in der der Griff wandert. */
  readonly trackWidth: number;
}

/** Schmaler wird der Griff nie, sonst ist er nicht mehr zu treffen. */
const SMALLEST_THUMB = 24;
/** Erst wenn der Inhalt um mehr als so viel breiter ist, lässt er sich verschieben (Rundung). */
const OVERFLOW_TOLERANCE = 1;

/** So weit lässt sich der Inhalt verschieben. */
function contentTravel(view: ScrollView): number {
  return Math.max(0, view.scrollWidth - view.clientWidth);
}

function thumbWidth(view: ScrollView): number {
  const visibleShare = Math.min(1, view.clientWidth / view.scrollWidth);
  return Math.max(SMALLEST_THUMB, view.trackWidth * visibleShare);
}

/** So weit wandert der Griff in der Bahn (nie 0, damit nicht durch null geteilt wird). */
function thumbTravel(view: ScrollView): number {
  return Math.max(1, view.trackWidth - thumbWidth(view));
}

/** Der Griff: so breit wie der sichtbare Anteil (mindestens 24 px), anteilig zur Verschiebung gestellt. */
export function thumbOf(view: ScrollView & { readonly scrollLeft: number }): {
  width: number;
  left: number;
} {
  const travel = contentTravel(view);
  const share = travel === 0 ? 0 : view.scrollLeft / travel;
  return { width: thumbWidth(view), left: share * (view.trackWidth - thumbWidth(view)) };
}

/** Zieht man den Griff um `dx`, verschiebt sich der Inhalt im Verhältnis der beiden Wege. */
export function scrollLeftForThumbDrag(start: number, dx: number, view: ScrollView): number {
  return start + (dx / thumbTravel(view)) * contentTravel(view);
}

/** Ein Klick in die Bahn bei `x` (ab ihrem Anfang): Der Griff springt mit seiner Mitte dorthin. */
export function scrollLeftForTrackClick(x: number, view: ScrollView): number {
  const thumbLeft = x - thumbWidth(view) / 2;
  const scrollLeft = (thumbLeft / thumbTravel(view)) * contentTravel(view);
  return Math.min(Math.max(0, scrollLeft), contentTravel(view));
}

/** Ist der Inhalt breiter als der sichtbare Bereich? Nur dann gibt es Pfeile und Leiste. */
export function overflows(scrollWidth: number, clientWidth: number): boolean {
  return scrollWidth > clientWidth + OVERFLOW_TOLERANCE;
}
