import type { PlaybackView } from "../animation/playback-view";
import type { DrawingContext } from "./drawing-context";
import type { MotionPreference } from "./motion-preference";
import type { RenderSettings } from "./render-settings";
import { cellCenterOn } from "./stage-layout";
import type { StageLayout } from "./stage-layout";

/** Der Radius des Lichtpunkts in Zellen. */
const DOT_RADIUS_IN_CELLS = 0.3;
/** Im schwächsten Augenblick des Pulsierens ist der wartende Lichtpunkt so groß (Anteil der vollen Größe). */
const DIMMEST_RESTING_SIZE = 0.5;

/**
 * Zeichnet den Lichtpunkt: ein leuchtender Punkt, innen weiß, zum Rand hin in seiner Farbe.
 * Am Haltepunkt pulsiert er (Größe und Leuchten wachsen und schrumpfen). Wünscht der Besucher
 * weniger Bewegung, leuchtet er stattdessen ruhig in voller Größe.
 */
export class DotPainter {
  public draw(
    context: DrawingContext,
    view: PlaybackView,
    layout: StageLayout,
    settings: RenderSettings,
    motion: MotionPreference,
  ): void {
    const dot = view.dotPosition();
    if (!view.isDotVisible || dot === undefined) return;

    const size = this.sizeOf(view, motion);
    const position = cellCenterOn(layout, dot);
    const radius = layout.cellSize * DOT_RADIUS_IN_CELLS * size;

    const glowingBall = context.createRadialGradient(
      position.x,
      position.y,
      0,
      position.x,
      position.y,
      radius,
    );
    glowingBall.addColorStop(0, "#ffffff");
    glowingBall.addColorStop(0.25, "#ffffff");
    glowingBall.addColorStop(1, settings.dotColor);

    context.save();
    context.fillStyle = glowingBall;
    context.shadowColor = settings.dotColor;
    context.shadowBlur = layout.cellSize * layout.pixelRatio * size;
    context.beginPath();
    context.arc(position.x, position.y, radius, 0, 2 * Math.PI);
    context.fill();
    context.restore();
  }

  /** Wie groß der Lichtpunkt ist, als Anteil seiner vollen Größe (0,5 bis 1). */
  private sizeOf(view: PlaybackView, motion: MotionPreference): number {
    if (!view.isResting || motion.isReduced) return 1;
    return DIMMEST_RESTING_SIZE + (1 - DIMMEST_RESTING_SIZE) * view.restingPulse;
  }
}
