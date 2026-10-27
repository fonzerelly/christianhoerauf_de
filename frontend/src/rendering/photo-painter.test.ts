import { describe, expect, it } from "vitest";
import type { PagePhoto } from "../domain/pages/maze-page-generator";
import { FakeLayers } from "../test-support/fake-layers";
import { mazePage } from "../test-support/maze-page-builder";
import { recordingContext } from "../test-support/recording-context";
import { PhotoPainter } from "./photo-painter";
import { TEST_LAYOUT, TEST_SETTINGS } from "./test-settings";

// Zellen zu 10 Pixeln, Rand (5, 5), Wände 2 Pixel breit. Das Foto liegt auf den Zellen (1, 1) bis
// (4, 4): von 15 bis 55 Pixeln, um die halbe Wandbreite eingerückt also von 16 bis 54 (38 breit).
const PHOTO: PagePhoto = { photo: "chris", left: 1, top: 1, size: 4, lapEnds: [10, 20, 30] };
const PAGE = mazePage({ columns: 8, rows: 6, photo: PHOTO });
const CHRIS = { name: "Chris" } as unknown as CanvasImageSource;

function setup({ isLoaded = true } = {}) {
  const image = isLoaded ? CHRIS : undefined;
  const layers = new FakeLayers();
  const asked: string[] = [];
  const painter = new PhotoPainter(layers.create, (name) => {
    asked.push(name);
    return image;
  });
  const draw = (progress: number, page = PAGE): string[] => {
    const { context, calls } = recordingContext();
    painter.draw(context, page, progress, TEST_LAYOUT, TEST_SETTINGS);
    return calls;
  };
  return { painter, layers, asked, draw };
}

/** So wird eine verkleinerte Fläche von `blocks` × `blocks` Pixeln grob aufs Foto gezogen. */
function pixelated(layerName: string, blocks: number): string[] {
  return [
    "save()",
    "imageSmoothingEnabled = false",
    `drawImage(<${layerName}>, 0, 0, ${String(blocks)}, ${String(blocks)}, 16, 16, 38, 38)`,
    "restore()",
  ];
}

describe("PhotoPainter", () => {
  it("zeichnet nichts auf einer Seite ohne Foto", () => {
    const { draw, layers } = setup();

    expect(draw(0, mazePage({ columns: 8, rows: 6 }))).toEqual([]);
    expect(layers.created).toEqual([]);
  });

  it("zeichnet nichts, solange das Foto noch nicht geladen ist", () => {
    const { draw, asked } = setup({ isLoaded: false });

    expect(draw(0)).toEqual([]);
    expect(asked).toEqual(["chris"]);
  });

  it("zeigt das Foto vor der ersten Runde grob: ein Block je zwei Zellen", () => {
    const { draw, layers } = setup();

    expect(draw(9.5)).toEqual(pixelated("Fläche 1", 2));
    expect(layers.created).toEqual([
      {
        width: 2,
        height: 2,
        calls: ["imageSmoothingQuality = high", "drawImage(<Chris>, 0, 0, 2, 2)"],
      },
    ]);
  });

  it("wird nach jeder Runde feiner: ein Block je Zelle, dann je halbe Zelle", () => {
    const { draw } = setup();

    expect(draw(10)).toEqual(pixelated("Fläche 1", 4));
    expect(draw(25)).toEqual(pixelated("Fläche 2", 8));
  });

  it("ist nach der dritten Runde scharf", () => {
    const { draw } = setup();

    expect(draw(30)).toEqual(["drawImage(<Chris>, 16, 16, 38, 38)"]);
  });

  it("verkleinert das Foto je Stufe nur einmal", () => {
    const { draw, layers } = setup();

    draw(0);
    draw(5);

    expect(layers.created).toHaveLength(1);
  });

  it("verkleinert neu, wenn die vorab gezeichneten Bilder verworfen wurden", () => {
    const { draw, layers, painter } = setup();
    draw(0);

    painter.discardPreparedImages();
    draw(0);

    expect(layers.created).toHaveLength(2);
  });
});
