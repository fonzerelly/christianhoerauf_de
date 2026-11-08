import { describe, expect, it } from "vitest";
import { ScrollControls } from "./scroll-controls";
import type { PointerLike } from "./scroll-controls";

/** Ein Ziel für Ereignisse: merkt sich die Hörer (auch die für die Capture-Phase) und löst sie aus. */
class Target {
  private readonly listeners: {
    type: string;
    listener: (event: PointerLike) => void;
    capture: boolean;
  }[] = [];
  public readonly classes = new Set<string>();
  public readonly styles = new Map<string, string>();
  public readonly classList = {
    toggle: (name: string, force: boolean): boolean => {
      if (force) this.classes.add(name);
      else this.classes.delete(name);
      return force;
    },
  };
  public readonly style = {
    setProperty: (name: string, value: string): void => {
      this.styles.set(name, value);
    },
  };

  public addEventListener(
    type: string,
    listener: (event: PointerLike) => void,
    capture = false,
  ): void {
    this.listeners.push({ type, listener, capture });
  }

  /** Löst das Ereignis aus; liefert, ob jemand es abgefangen hat (`stopPropagation`). */
  public fire(
    type: string,
    event: Partial<PointerLike> = {},
  ): { stopped: boolean; prevented: boolean } {
    const result = { stopped: false, prevented: false };
    const full: PointerLike = {
      clientX: 0,
      pointerId: 1,
      pointerType: "mouse",
      button: 0,
      target: this,
      preventDefault: () => {
        result.prevented = true;
      },
      stopPropagation: () => {
        result.stopped = true;
      },
      ...event,
    };
    for (const { type: listened, listener } of this.listeners)
      if (listened === type) listener(full);
    return result;
  }
}

class Scroll extends Target {
  public scrollLeft = 0;
  public scrollWidth = 2000;
  public clientWidth = 500;
  public readonly scrolledBy: { left: number; behavior: string }[] = [];
  public readonly scrolledTo: { left: number; behavior: string }[] = [];
  public scrollBy(options: { left: number; behavior: "auto" | "smooth" }): void {
    this.scrolledBy.push(options);
  }
  public scrollTo(options: { left: number; behavior: "auto" | "smooth" }): void {
    this.scrolledTo.push(options);
  }
}

class Arrow extends Target {
  public hidden: boolean | string = false;
  public disabled = false;
  public toggleAttribute(name: string, force: boolean): boolean {
    if (name === "disabled") this.disabled = force;
    return force;
  }
}

class Track extends Target {
  public clientWidth = 400;
  public getBoundingClientRect(): { left: number } {
    return { left: 100 };
  }
}

class Thumb extends Target {
  public captured: number[] = [];
  public setPointerCapture(id: number): void {
    this.captured.push(id);
  }
}

function setup(options: { reduced?: boolean; scrollWidth?: number } = {}) {
  const frame = new Target();
  const scroll = new Scroll();
  scroll.scrollWidth = options.scrollWidth ?? 2000;
  const earlier = new Arrow();
  const later = new Arrow();
  const track = new Track();
  const thumb = new Thumb();
  let scrolls = 0;
  const controls = new ScrollControls({
    frame,
    scroll,
    earlier,
    later,
    track,
    thumb,
    prefersReducedMotion: () => options.reduced ?? false,
    onScroll: () => {
      scrolls++;
    },
  });
  return { frame, scroll, earlier, later, track, thumb, controls, scrolls: () => scrolls };
}

describe("ScrollControls", () => {
  it("zeigt Pfeile und Leiste nur, wenn der Inhalt breiter ist als der Platz", () => {
    const wide = setup();
    expect(wide.earlier.hidden).toBe(false);
    expect(wide.frame.classes.has("fits")).toBe(false);

    const narrow = setup({ scrollWidth: 500 });
    expect(narrow.earlier.hidden).toBe(true);
    expect(narrow.later.hidden).toBe(true);
    expect(narrow.frame.classes.has("fits")).toBe(true);
  });

  it("graut den Pfeil am Anfang bzw. Ende aus", () => {
    const { scroll, earlier, later, controls } = setup();

    controls.update();
    expect([earlier.disabled, later.disabled]).toEqual([true, false]);

    scroll.scrollLeft = 1500;
    scroll.fire("scroll");
    expect([earlier.disabled, later.disabled]).toEqual([false, true]);
  });

  it("stellt den Griff nach der Verschiebung", () => {
    const { scroll, thumb } = setup();

    scroll.scrollLeft = 750;
    scroll.fire("scroll");

    expect(thumb.styles.get("width")).toBe("100px");
    expect(thumb.styles.get("left")).toBe("150px");
  });

  it("verschiebt mit den Pfeilen um 60 % der Breite, sanft oder bei weniger Bewegung sofort", () => {
    const { scroll, earlier, later } = setup();
    later.fire("click");
    earlier.fire("click");
    expect(scroll.scrolledBy).toEqual([
      { left: 300, behavior: "smooth" },
      { left: -300, behavior: "smooth" },
    ]);

    const reduced = setup({ reduced: true });
    reduced.later.fire("click");
    expect(reduced.scroll.scrolledBy).toEqual([{ left: 300, behavior: "auto" }]);
  });

  it("verschiebt den Inhalt, wenn man am Griff zieht", () => {
    const { scroll, thumb } = setup();

    const down = thumb.fire("pointerdown", { clientX: 10, pointerId: 7 });
    thumb.fire("pointermove", { clientX: 40 });
    expect(scroll.scrollLeft).toBe(150);
    expect(thumb.captured).toEqual([7]);
    expect(down).toEqual({ stopped: true, prevented: true });

    thumb.fire("pointerup");
    thumb.fire("pointermove", { clientX: 100 });
    expect(scroll.scrollLeft).toBe(150);
  });

  it("hört beim Abbrechen des Ziehens am Griff auf", () => {
    const { scroll, thumb } = setup();
    thumb.fire("pointerdown", { clientX: 10 });
    thumb.fire("pointercancel");

    thumb.fire("pointermove", { clientX: 40 });

    expect(scroll.scrollLeft).toBe(0);
  });

  it("springt bei einem Klick in die Bahn mit der Mitte des Griffs dorthin", () => {
    const { scroll, track } = setup();

    track.fire("pointerdown", { clientX: 300 }); // 200 px in der Bahn

    expect(scroll.scrolledTo).toEqual([{ left: 750, behavior: "smooth" }]);
  });

  it("überlässt einen Druck auf den Griff dem Griff, nicht der Bahn", () => {
    const { scroll, track, thumb } = setup();

    track.fire("pointerdown", { clientX: 300, target: thumb });

    expect(scroll.scrolledTo).toEqual([]);
  });

  it("lässt den Inhalt mit der Maus ziehen; danach löst das Loslassen keinen Klick aus", () => {
    const { scroll } = setup();
    scroll.scrollLeft = 1000;

    scroll.fire("pointerdown", { clientX: 500 });
    scroll.fire("pointermove", { clientX: 498 }); // unter 4 px: noch kein Ziehen
    expect(scroll.scrollLeft).toBe(1000);
    scroll.fire("pointermove", { clientX: 450 });
    expect(scroll.scrollLeft).toBe(1050);
    expect(scroll.classes.has("dragging")).toBe(true);
    scroll.fire("pointerup");
    expect(scroll.classes.has("dragging")).toBe(false);

    expect(scroll.fire("click")).toEqual({ stopped: true, prevented: true });
    expect(scroll.fire("click")).toEqual({ stopped: false, prevented: false });
  });

  it("zieht nicht mit dem Finger (das kann der Browser selbst) und nicht mit der rechten Maustaste", () => {
    const { scroll } = setup();

    scroll.fire("pointerdown", { clientX: 500, pointerType: "touch" });
    scroll.fire("pointermove", { clientX: 400 });
    scroll.fire("pointerdown", { clientX: 500, button: 2 });
    scroll.fire("pointermove", { clientX: 400 });

    expect(scroll.scrollLeft).toBe(0);
  });

  it("hört auf zu ziehen, wenn die Maus den Bereich verlässt", () => {
    const { scroll } = setup();
    scroll.fire("pointerdown", { clientX: 500 });
    scroll.fire("pointerleave");

    scroll.fire("pointermove", { clientX: 400 });

    expect(scroll.scrollLeft).toBe(0);
  });

  it("meldet jedes Verschieben (ein offenes Stationsmenü schließt dann)", () => {
    const { scroll, scrolls } = setup();

    scroll.fire("scroll");

    expect(scrolls()).toBe(1);
  });
});
