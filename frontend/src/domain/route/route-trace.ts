import { lastOf } from "../lists";
import type { Position } from "../maze/position";
import type { RouteStep, StepKind } from "./route-step";

/** Die Route, während sie gebaut wird: Wegstück für Wegstück, immer vom Ende aus weiter. */
export class RouteTrace {
  private readonly stepList: RouteStep[] = [];
  private glyphEnd: number | undefined;

  public get steps(): readonly RouteStep[] {
    return this.stepList;
  }

  /** Die Zelle, auf der die Route gerade steht. Wirft, solange die Route leer ist. */
  public get end(): Position {
    const { x, y } = lastOf(this.stepList);
    return { x, y };
  }

  /** Index des Wegstücks, auf dem die zuletzt geschriebene Glyphe endet. */
  public get lastGlyphEnd(): number | undefined {
    return this.glyphEnd;
  }

  public addStep(position: Position, kind: StepKind): void {
    this.stepList.push({ x: position.x, y: position.y, kind, isDot: false });
  }

  /**
   * Verlängert die Route Zelle für Zelle in gerader Linie bis zum Ziel. Das Ziel muss in
   * derselben Zeile oder Spalte liegen wie das Ende der Route.
   */
  public walkTo(targetX: number, targetY: number, kind: StepKind): void {
    let { x, y } = this.end;
    if (x !== targetX && y !== targetY) {
      throw new RangeError(
        `Von (${String(x)}, ${String(y)}) nach (${String(targetX)}, ${String(targetY)}) geht es nicht geradeaus`,
      );
    }
    while (x !== targetX || y !== targetY) {
      x += Math.sign(targetX - x);
      y += Math.sign(targetY - y);
      this.addStep({ x, y }, kind);
    }
  }

  /** Der Lichtpunkt hinterlässt auf der Zelle am Ende einen Punkt. */
  public markEndAsDot(): void {
    const last = lastOf(this.stepList);
    this.stepList[this.stepList.length - 1] = { ...last, isDot: true };
  }

  /** Merkt das aktuelle Ende als Ende der zuletzt geschriebenen Glyphe. */
  public markGlyphEnd(): void {
    this.glyphEnd = this.stepList.length - 1;
  }
}
