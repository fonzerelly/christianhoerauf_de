import { itemAt } from "../../domain/lists";

/** Dauer und Kurve des Übergangs beim Auf- und Zuklappen (wie Prototyp 12). */
export const FOLD_DURATION = 450;
export const FOLD_EASING = "cubic-bezier(0.4, 0, 0.2, 1)";

/** Eine Lage auf der Seite in Fensterkoordinaten (wie `getBoundingClientRect`). */
export interface Rect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}
/**
 * Wie die Zeitleiste gerade aussieht: Höhe, Lage des sichtbaren Bereichs, je Eintrag Lage und
 * Abbild, und aufgeklappt das Gerippe (Linie und Striche ohne Texte).
 */
export interface Snapshot<Image> {
  readonly height: number;
  readonly visible: Rect;
  readonly entries: ReadonlyMap<string, { readonly rect: Rect; readonly image: Image }>;
  readonly skeleton: { readonly rect: Rect; readonly image: Image } | undefined;
}
export interface RunningAnimation {
  readonly finished: Promise<unknown>;
  cancel(): void;
}
/** Das DOM für den Übergang (im Browser `DomTransitionPort`). */
export interface TransitionPort<Image> {
  /** Hält das Aussehen fest; `undefined`, wenn keine Stationen zu sehen sind. */
  capture(): Snapshot<Image> | undefined;
  /** Legt die Ebene über den sichtbaren Bereich. */
  openLayer(visible: Rect): Image;
  /** Legt ein Abbild an die Stelle `at` auf der Ebene. */
  put(layer: Image, image: Image, at: Rect): void;
  /** Legt das Gerippe in eine Hülle auf der Ebene; die Hülle wird gewischt. */
  wrapSkeleton(layer: Image, image: Image, at: Rect): Image;
  /** Spielt eine Animation auf einem Abbild, der Ebene oder der Zeitleiste selbst (`"container"`). */
  animate(
    target: Image | "container",
    keyframes: Keyframe[],
    timing: KeyframeAnimationOptions,
  ): RunningAnimation;
  /** Markiert die Zeitleiste für die Dauer (CSS) und versteckt den echten neuen Inhalt. */
  setRunning(running: boolean): void;
  closeLayer(layer: Image): void;
}

const px = (value: number): string => `${String(value)}px`;
const OPEN = "inset(0 0 0 0)";
const SHUT = "inset(0 100% 0 0)";
/** So blass ist die Linie am Ende des Wischens bzw. an seinem Anfang. */
const WIPED_OPACITY = 0.3;

/** Das alte Bild eines Eintrags: gleitet um (dx, dy) und ist nach 60 % ausgeblendet. */
function movingOut(dx: number, dy: number): Keyframe[] {
  return [
    { transform: "none", opacity: 1 },
    { opacity: 0, offset: 0.6 },
    { transform: `translate(${px(dx)}, ${px(dy)})`, opacity: 0 },
  ];
}

/** Das neue Bild: kommt von der alten Stelle und ist ab 30 % eingeblendet. */
function movingIn(dx: number, dy: number): Keyframe[] {
  return [
    { transform: `translate(${px(-dx)}, ${px(-dy)})`, opacity: 0 },
    { opacity: 0, offset: 0.3 },
    { transform: "none", opacity: 1 },
  ];
}

/**
 * Der Übergang beim Auf- und Zuklappen der Zeitleiste (07.11., „dann wäre es perfekt“): Beim
 * Zuklappen fahren die Texte der Stationen und Engagements zu ihrem Platz in der Zeile zusammen,
 * während die Linie samt Strichen nach links wegwischt; beim Aufklappen fahren sie auseinander,
 * und die Linie erscheint von links. Die Höhe gleitet mit (450 ms). Bei weniger Bewegung, und wenn
 * vorher oder nachher nichts zu sehen ist, wird nur neu gezeichnet.
 *
 * Alter und neuer Zustand sind ganz verschiedene Elemente. Deshalb wird sofort der neue gezeichnet
 * und versteckt, und darüber liegt für die Dauer eine Ebene mit Abbildern: je Eintrag (über
 * `data-station` bzw. `data-transition` gefunden) eins vom alten und eins vom neuen Aussehen, die
 * gemeinsam von der alten an die neue Stelle gleiten; das alte blendet aus, das neue ein. Was es nur
 * in einem Zustand gibt, blendet an Ort und Stelle. Das DOM erledigt der `TransitionPort`.
 */
export class FoldTransition<Image> {
  /** Beendet den laufenden Übergang; `undefined`, wenn keiner läuft. */
  private stopRunning: (() => void) | undefined;

  public constructor(
    private readonly port: TransitionPort<Image>,
    private readonly prefersReducedMotion: () => boolean,
  ) {}

  /** Hält das Aussehen fest, zeichnet mit `render` den neuen Zustand und spielt den Übergang. */
  public run(render: () => void): void {
    this.finish();
    const before = this.prefersReducedMotion() ? undefined : this.port.capture();
    render();
    if (before === undefined) return;
    const after = this.port.capture();
    if (after !== undefined) this.play(before, after);
  }

  /** Beendet einen laufenden Übergang sofort (etwa weil neu gezeichnet wird). */
  public finish(): void {
    this.stopRunning?.();
  }

  private play(before: Snapshot<Image>, after: Snapshot<Image>): void {
    const { port } = this;
    const timing = { duration: FOLD_DURATION, easing: FOLD_EASING, fill: "both" } as const;
    const layer = port.openLayer(after.visible);
    port.setRunning(true);
    const running = [
      port.animate(
        layer,
        [{ height: px(before.visible.height) }, { height: px(after.visible.height) }],
        timing,
      ),
      port.animate(
        "container",
        [{ height: px(before.height) }, { height: px(after.height) }],
        timing,
      ),
    ];

    // Die Linie: zuklappen wischt sie nach links weg, aufklappen von links herein.
    const skeleton = before.skeleton ?? after.skeleton;
    if (skeleton !== undefined) {
      const wrapper = port.wrapSkeleton(layer, skeleton.image, skeleton.rect);
      const shown = { clipPath: OPEN, opacity: 1 };
      const wiped = { clipPath: SHUT, opacity: WIPED_OPACITY };
      const closing = before.skeleton !== undefined;
      running.push(port.animate(wrapper, closing ? [shown, wiped] : [wiped, shown], timing));
    }

    for (const [key, old] of before.entries) {
      const fresh = after.entries.get(key);
      port.put(layer, old.image, old.rect);
      if (fresh === undefined) {
        // nur vorher da: an Ort und Stelle ausblenden
        running.push(port.animate(old.image, [{ opacity: 1 }, { opacity: 0 }], timing));
        continue;
      }
      const dx = fresh.rect.left - old.rect.left;
      const dy = fresh.rect.top - old.rect.top;
      port.put(layer, fresh.image, fresh.rect);
      running.push(port.animate(old.image, movingOut(dx, dy), timing));
      running.push(port.animate(fresh.image, movingIn(dx, dy), timing));
    }
    for (const [key, fresh] of after.entries) {
      if (before.entries.has(key)) continue;
      // nur nachher da (etwa die Punkte der Zeile): an Ort und Stelle einblenden
      port.put(layer, fresh.image, fresh.rect);
      const appearing = [{ opacity: 0 }, { opacity: 0, offset: 0.5 }, { opacity: 1 }];
      running.push(port.animate(fresh.image, appearing, timing));
    }

    let done = false;
    const stop = (): void => {
      if (done) return;
      done = true;
      running.forEach((animation) => {
        animation.cancel();
      });
      port.closeLayer(layer);
      port.setRunning(false);
      this.stopRunning = undefined;
    };
    this.stopRunning = stop;
    void itemAt(running, 0).finished.then(stop, stop);
  }
}
