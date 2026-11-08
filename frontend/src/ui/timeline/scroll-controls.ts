import {
  overflows,
  scrollLeftForThumbDrag,
  scrollLeftForTrackClick,
  thumbOf,
} from "../../domain/timeline/scrollbar";
import type { ScrollView } from "../../domain/timeline/scrollbar";

/** So weit verschiebt ein Pfeil: dieser Anteil der sichtbaren Breite. */
const ARROW_STEP_SHARE = 0.6;
/** Erst ab so vielen Pixeln Bewegung gilt ein Druck mit der Maus als Ziehen (sonst ist es ein Klick). */
const DRAG_THRESHOLD = 4;
/** So nah am Anfang bzw. Ende gilt der Inhalt als ganz verschoben (Rundung). */
const EDGE_TOLERANCE = 1;

/** Was die Steuerung von einem Zeiger-Ereignis braucht (ein Ausschnitt von `PointerEvent`). */
export interface PointerLike {
  readonly clientX: number;
  readonly pointerId: number;
  readonly pointerType: string;
  readonly button: number;
  readonly target: unknown;
  preventDefault(): void;
  stopPropagation(): void;
}

interface Listening {
  addEventListener(type: string, listener: (event: PointerLike) => void, capture?: boolean): void;
}
interface Styled {
  readonly style: { setProperty(name: string, value: string): void };
}
interface Arrow {
  hidden: boolean | string;
  toggleAttribute(name: "disabled", force: boolean): boolean;
}
interface Classed {
  readonly classList: { toggle(name: string, force: boolean): boolean };
}

export interface ScrollControlsParts {
  readonly frame: Classed;
  readonly scroll: Listening &
    Classed & {
      scrollLeft: number;
      readonly scrollWidth: number;
      readonly clientWidth: number;
      scrollBy(options: { left: number; behavior: "auto" | "smooth" }): void;
      scrollTo(options: { left: number; behavior: "auto" | "smooth" }): void;
    };
  readonly earlier: Listening & Arrow;
  readonly later: Listening & Arrow;
  readonly track: Listening &
    Styled & { readonly clientWidth: number; getBoundingClientRect(): { left: number } };
  readonly thumb: Listening & Styled & { setPointerCapture(pointerId: number): void };
  readonly prefersReducedMotion: () => boolean;
  /** Der Inhalt wurde verschoben. */
  readonly onScroll: () => void;
}

const px = (value: number): string => `${String(value)}px`;

/**
 * Verschieben der Zeitleiste (ADR 0007, Q46): Pfeile „‹“ und „›“ verschieben um 60 % der
 * sichtbaren Breite (bei weniger Bewegung ohne Gleiten) und sind am Anfang bzw. Ende ausgegraut;
 * passt alles, fehlen Pfeile und Leiste (Klasse `fits` am Rahmen). Die eigene Bildlaufleiste:
 * Der Griff folgt der Verschiebung, Ziehen am Griff verschiebt den Inhalt, ein Druck in die Bahn
 * springt dorthin. Mit der Maus lässt sich der Inhalt selbst ziehen (Klasse `dragging`); wurde
 * gezogen, löst das Loslassen keinen Klick auf einer Station aus. Mit dem Finger zieht der Browser.
 */
export class ScrollControls {
  /** Wo ein Ziehen am Griff bzw. am Inhalt begann; `undefined`, wenn gerade keins läuft. */
  private thumbDrag: { x: number; scrollLeft: number } | undefined;
  private contentDrag: { x: number; scrollLeft: number } | undefined;
  /** Wurde mit der Maus gezogen? Dann fängt der nächste Klick ab. */
  private hasDragged = false;

  public constructor(private readonly parts: ScrollControlsParts) {
    const { scroll, earlier, later } = parts;
    earlier.addEventListener("click", () => {
      this.scrollByArrow(-1);
    });
    later.addEventListener("click", () => {
      this.scrollByArrow(1);
    });
    scroll.addEventListener("scroll", () => {
      this.update();
      parts.onScroll();
    });
    this.connectThumb();
    this.connectTrack();
    this.connectContentDrag();
    this.update();
  }

  /** Stellt Pfeile, Rahmen und Griff nach der aktuellen Verschiebung. */
  public update(): void {
    const { frame, scroll, earlier, later, thumb } = this.parts;
    const canScroll = overflows(scroll.scrollWidth, scroll.clientWidth);
    frame.classList.toggle("fits", !canScroll);
    earlier.hidden = !canScroll;
    later.hidden = !canScroll;
    earlier.toggleAttribute("disabled", scroll.scrollLeft <= EDGE_TOLERANCE);
    later.toggleAttribute(
      "disabled",
      scroll.scrollLeft >= scroll.scrollWidth - scroll.clientWidth - EDGE_TOLERANCE,
    );
    const { width, left } = thumbOf({ ...this.view(), scrollLeft: scroll.scrollLeft });
    thumb.style.setProperty("width", px(width));
    thumb.style.setProperty("left", px(left));
  }

  private view(): ScrollView {
    const { scroll, track } = this.parts;
    return {
      scrollWidth: scroll.scrollWidth,
      clientWidth: scroll.clientWidth,
      trackWidth: track.clientWidth,
    };
  }

  private behavior(): "auto" | "smooth" {
    return this.parts.prefersReducedMotion() ? "auto" : "smooth";
  }

  private scrollByArrow(direction: number): void {
    const { scroll } = this.parts;
    scroll.scrollBy({
      left: direction * scroll.clientWidth * ARROW_STEP_SHARE,
      behavior: this.behavior(),
    });
  }

  private connectThumb(): void {
    const { thumb, scroll } = this.parts;
    thumb.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      thumb.setPointerCapture(event.pointerId);
      this.thumbDrag = { x: event.clientX, scrollLeft: scroll.scrollLeft };
    });
    thumb.addEventListener("pointermove", (event) => {
      if (this.thumbDrag === undefined) return;
      const dx = event.clientX - this.thumbDrag.x;
      scroll.scrollLeft = scrollLeftForThumbDrag(this.thumbDrag.scrollLeft, dx, this.view());
    });
    const release = (): void => {
      this.thumbDrag = undefined;
    };
    thumb.addEventListener("pointerup", release);
    thumb.addEventListener("pointercancel", release);
  }

  private connectTrack(): void {
    const { track, scroll } = this.parts;
    track.addEventListener("pointerdown", (event) => {
      if (event.target !== track) return; // ein Druck auf den Griff gehört dem Griff
      const x = event.clientX - track.getBoundingClientRect().left;
      scroll.scrollTo({ left: scrollLeftForTrackClick(x, this.view()), behavior: this.behavior() });
    });
  }

  private connectContentDrag(): void {
    const { scroll } = this.parts;
    scroll.addEventListener("pointerdown", (event) => {
      if (event.pointerType !== "mouse" || event.button !== 0) return;
      this.contentDrag = { x: event.clientX, scrollLeft: scroll.scrollLeft };
      this.hasDragged = false;
    });
    scroll.addEventListener("pointermove", (event) => {
      if (this.contentDrag === undefined) return;
      const dx = event.clientX - this.contentDrag.x;
      if (!this.hasDragged && Math.abs(dx) > DRAG_THRESHOLD) {
        this.hasDragged = true;
        scroll.classList.toggle("dragging", true);
      }
      if (this.hasDragged) scroll.scrollLeft = this.contentDrag.scrollLeft - dx;
    });
    const release = (): void => {
      this.contentDrag = undefined;
      scroll.classList.toggle("dragging", false);
    };
    scroll.addEventListener("pointerup", release);
    scroll.addEventListener("pointerleave", release);
    scroll.addEventListener(
      "click",
      (event) => {
        if (!this.hasDragged) return;
        event.stopPropagation();
        event.preventDefault();
        this.hasDragged = false;
      },
      true,
    );
  }
}
