import { describe, expect, it } from "vitest";
import { layoutStage } from "../rendering/stage-layout";
import { applyStageLayout } from "./stage-frame";

function fakeElement() {
  const properties = new Map<string, string>();
  return {
    style: {
      height: "",
      setProperty(name: string, value: string) {
        properties.set(name, value);
      },
    },
    properties,
  };
}

describe("applyStageLayout", () => {
  const layout = layoutStage(1450, 1, 3, { cellSize: 16 }, 15);

  it("macht die Bühne so hoch wie ihre Reihen", () => {
    const stage = fakeElement();

    applyStageLayout(stage, fakeElement(), layout);

    expect(stage.style.height).toBe("240px");
  });

  it("nennt der Seite Anfang und Breite des Labyrinths, damit Zeitleiste und Fragefeld bündig darunter stehen", () => {
    const page = fakeElement();

    applyStageLayout(fakeElement(), page, layout);

    // 90 Spalten zu 16 px = 1440 px, mittig in 1450 px: 5 px Rand
    expect(page.properties.get("--maze-left")).toBe("5px");
    expect(page.properties.get("--maze-width")).toBe("1440px");
  });
});
