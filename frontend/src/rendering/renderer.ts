import type { PlaybackView } from "../animation/playback-view";
import type { StageLayout } from "./stage-layout";

/**
 * Der Port zum Zeichnen: Wie die Animation auf den Bildschirm kommt. `CanvasRenderer` zeichnet
 * auf ein Canvas; ein anderer Adapter könnte etwas anderes zeichnen.
 */
export interface Renderer {
  /** Stellt auf eine neue Einteilung der Bühne um (die vorab gezeichneten Bilder werden ungültig). */
  resize(layout: StageLayout): void;
  /** Zeichnet ein Bild. `seconds` ist die Zeit seit dem vorigen Bild. */
  draw(view: PlaybackView, seconds: number): void;
  /** Wirft alle vorab gezeichneten Bilder weg, falls der Browser den Grafikspeicher freigegeben hat. */
  discardPreparedImages(): void;
  /** Läuft gerade eine Bildstörung? Dann muss weitergezeichnet werden, auch wenn die Animation steht. */
  readonly isGlitching: boolean;
}
