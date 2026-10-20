import { BRIGHTNESS_LEVELS } from "../animation/trail";
import type { PlaybackView } from "../animation/playback-view";
import type { MazePage } from "../domain/pages/maze-page-generator";
import type { StepKind } from "../domain/route/route-step";
import { itemAt } from "../domain/lists";
import type { DrawingContext } from "./drawing-context";
import type { RenderSettings } from "./render-settings";
import { cellCenterOn } from "./stage-layout";
import type { StageLayout } from "./stage-layout";

/** Der Abschnitt der Route, der noch leuchtet: alles davor ist verglommen, alles danach noch nicht gelaufen. */
interface GlowingSteps {
  readonly first: number;
  readonly last: number;
}

/** Wie groß der Kreis eines Punkts (Umlaut, Satzpunkt) im Verhältnis zur Spurbreite ist. */
const DOT_RADIUS_IN_TRAIL_WIDTHS = 0.8;

/**
 * Zeichnet die Leuchtspur hinter dem Lichtpunkt. Wegstücke gleicher Art und Helligkeitsstufe
 * werden in einem Rutsch gezeichnet - jedes Stück einzeln wäre am Handy zu langsam. Von der Route
 * wird nur der Teil betrachtet, der noch leuchtet.
 */
export class TrailPainter {
  public draw(
    context: DrawingContext,
    view: PlaybackView,
    page: MazePage,
    layout: StageLayout,
    settings: RenderSettings,
  ): void {
    const steps: GlowingSteps = {
      first: view.firstGlowingStep(),
      last: Math.min(Math.ceil(view.progress), page.route.length - 1),
    };
    const levelOfStep: number[] = [];
    for (let step = steps.first; step <= steps.last; step++) {
      levelOfStep[step] = view.trailLevelOf(step);
    }
    const trail = { context, view, page, layout, settings, steps, levelOfStep };

    context.save();
    context.strokeStyle = settings.trailColor;
    context.fillStyle = settings.trailColor;
    context.lineWidth = settings.trailWidth;
    context.lineCap = "butt";

    // Verbindungen zuerst, damit die Buchstaben darüber liegen
    for (let level = 1; level <= BRIGHTNESS_LEVELS; level++) {
      context.globalAlpha = (level / BRIGHTNESS_LEVELS) * settings.connectorOpacity;
      this.strokeSegments(trail, "connector", level);
    }

    context.shadowColor = settings.trailColor;
    context.shadowBlur = settings.glow * layout.pixelRatio;
    for (let level = 1; level <= BRIGHTNESS_LEVELS; level++) {
      context.globalAlpha = level / BRIGHTNESS_LEVELS;
      this.strokeSegments(trail, "letter", level);
      this.fillDots(trail, level);
    }
    context.restore();
  }

  /**
   * Zeichnet die gelaufenen Wegstücke einer Art und einer Helligkeitsstufe.
   *
   * Jedes Wegstück wird um eine halbe Spurbreite gegen die Laufrichtung versetzt gezeichnet (mit
   * stumpfen Enden). So schließen aufeinanderfolgende Stücke lückenlos und ohne Überlappung
   * aneinander an, auch um die Ecke. Würden sie sich überlappen, entstünden beim Ausblenden an
   * jedem Stufenwechsel dunklere Knoten (halbdurchsichtig auf halbdurchsichtig).
   */
  private strokeSegments(trail: Trail, kind: StepKind, level: number): void {
    const { context, view, page, layout, settings, steps, levelOfStep } = trail;
    const halfWidthInCells = settings.trailWidth / 2 / layout.cellSize;
    let hasSegments = false;

    context.beginPath();
    for (let step = steps.first; step <= steps.last; step++) {
      const current = itemAt(page.route, step);
      if (current.kind !== kind || levelOfStep[step] !== level) continue;

      const start = itemAt(page.route, step - 1);
      const isStillWalking = step > view.progress;
      const end = isStillWalking ? (view.dotPosition() ?? current) : current;
      const backX = (current.x - start.x) * halfWidthInCells;
      const backY = (current.y - start.y) * halfWidthInCells;

      const from = cellCenterOn(layout, { x: start.x - backX, y: start.y - backY });
      const to = cellCenterOn(layout, { x: end.x - backX, y: end.y - backY });
      context.moveTo(from.x, from.y);
      context.lineTo(to.x, to.y);
      hasSegments = true;
    }
    // Ein leerer Pfad mit Leuchten kostet den Browser trotzdem Zeit, deshalb nur zeichnen, wenn etwas da ist
    if (hasSegments) context.stroke();
  }

  /** Zeichnet die Punkte einer Helligkeitsstufe, bei denen der Lichtpunkt schon war. */
  private fillDots(trail: Trail, level: number): void {
    const { context, view, page, layout, settings, steps, levelOfStep } = trail;
    const lastFinishedStep = Math.min(steps.last, Math.floor(view.progress));
    let hasDots = false;

    context.beginPath();
    for (let step = steps.first; step <= lastFinishedStep; step++) {
      const current = itemAt(page.route, step);
      if (!current.isDot || levelOfStep[step] !== level) continue;

      const center = cellCenterOn(layout, current);
      context.moveTo(center.x, center.y);
      context.arc(
        center.x,
        center.y,
        settings.trailWidth * DOT_RADIUS_IN_TRAIL_WIDTHS,
        0,
        2 * Math.PI,
      );
      hasDots = true;
    }
    if (hasDots) context.fill();
  }
}

/** Alles, was die Teilschritte beim Zeichnen der Spur brauchen. */
interface Trail {
  readonly context: DrawingContext;
  readonly view: PlaybackView;
  readonly page: MazePage;
  readonly layout: StageLayout;
  readonly settings: RenderSettings;
  readonly steps: GlowingSteps;
  readonly levelOfStep: readonly number[];
}
