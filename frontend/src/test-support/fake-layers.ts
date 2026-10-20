import type { Layer } from "../rendering/drawing-context";
import { recordingContext } from "./recording-context";

/**
 * Legt Zeichenflächen für Tests an (statt Canvas-Elementen). Jede zeichnet ihre Aufrufe auf und
 * hat als Bild einen Namen mit Nummer ("Fläche 1"), an dem man sie in einer Aufzeichnung erkennt.
 */
export class FakeLayers {
  public readonly created: { width: number; height: number; calls: string[] }[] = [];

  public readonly create = (width: number, height: number): Layer => {
    const { context, calls } = recordingContext();
    this.created.push({ width, height, calls });
    return {
      context,
      image: { name: `Fläche ${String(this.created.length)}` } as unknown as CanvasImageSource,
      flush: () => {
        calls.push("flush()");
      },
    };
  };
}
