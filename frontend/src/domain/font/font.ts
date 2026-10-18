import { GLYPH_PATHS } from "./glyph-data";
import type { WaypointTuple } from "./glyph-data";
import type { Glyph } from "./glyph";

/** Dieses Zeichen steht im aufbereiteten Text für die Ersatzglyphe (Vollblock). */
export const REPLACEMENT_CHARACTER = "█";

function toGlyph(path: readonly WaypointTuple[]): Glyph {
  return path.map(([x, y, marker]) => (marker === undefined ? { x, y } : { x, y, marker }));
}

/** Die Schrift: ordnet jedem darstellbaren Zeichen seine Glyphe zu. */
export class Font {
  private readonly glyphs: ReadonlyMap<string, Glyph>;

  public constructor(paths: Readonly<Record<string, readonly WaypointTuple[]>>) {
    this.glyphs = new Map(
      Object.entries(paths).map(([character, path]) => [character, toGlyph(path)]),
    );
  }

  /** Kann die Schrift dieses Zeichen darstellen? */
  public hasGlyph(character: string): boolean {
    return this.glyphs.has(character);
  }

  /** Die Glyphe des Zeichens, oder `undefined` (z. B. beim Leerzeichen). */
  public glyphFor(character: string): Glyph | undefined {
    return this.glyphs.get(character);
  }
}

export function createDefaultFont(): Font {
  return new Font(GLYPH_PATHS);
}
