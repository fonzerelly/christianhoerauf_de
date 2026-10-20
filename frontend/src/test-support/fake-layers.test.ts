import { describe, expect, it } from "vitest";
import { FakeLayers } from "./fake-layers";

describe("FakeLayers", () => {
  it("legt Zeichenflächen mit der verlangten Größe an und merkt sie sich der Reihe nach", () => {
    const layers = new FakeLayers();

    layers.create(10, 20);
    layers.create(30, 40);

    expect(layers.created.map(({ width, height }) => [width, height])).toEqual([
      [10, 20],
      [30, 40],
    ]);
  });

  it("zeichnet auf jeder Fläche für sich auf und gibt ihr einen Namen mit Nummer", () => {
    const layers = new FakeLayers();
    const first = layers.create(1, 1);
    const second = layers.create(1, 1);

    first.context.beginPath();
    second.context.fill();

    expect(layers.created[0]?.calls).toEqual(["beginPath()"]);
    expect(layers.created[1]?.calls).toEqual(["fill()"]);
    expect(first.image).toEqual({ name: "Fläche 1" });
    expect(second.image).toEqual({ name: "Fläche 2" });
  });
});
