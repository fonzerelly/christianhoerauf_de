import { describe, expect, it } from "vitest";
import { recordingContext } from "./recording-context";

describe("recordingContext", () => {
  it("zeichnet Aufrufe mit ihren Werten auf", () => {
    const { context, calls } = recordingContext();

    context.beginPath();
    context.moveTo(1, 2);
    context.lineTo(3.5, 4);

    expect(calls).toEqual(["beginPath()", "moveTo(1, 2)", "lineTo(3.5, 4)"]);
  });

  it("zeichnet gesetzte Eigenschaften auf", () => {
    const { context, calls } = recordingContext();

    context.fillStyle = "#fff";
    context.lineWidth = 3;

    expect(calls).toEqual(["fillStyle = #fff", "lineWidth = 3"]);
  });

  it("zeichnet auch die Farbstufen eines Farbverlaufs auf", () => {
    const { context, calls } = recordingContext();

    const gradient = context.createRadialGradient(1, 2, 3, 4, 5, 6);
    gradient.addColorStop(0.5, "red");

    expect(calls).toEqual([
      "createRadialGradient(1, 2, 3, 4, 5, 6)",
      "gradient.addColorStop(0.5, red)",
    ]);
  });

  it("nennt einen Farbverlauf, der als Farbe gesetzt wird, <gradient>", () => {
    const { context, calls } = recordingContext();

    context.fillStyle = context.createRadialGradient(0, 0, 0, 1, 1, 1);

    expect(calls).toEqual(["createRadialGradient(0, 0, 0, 1, 1, 1)", "fillStyle = <gradient>"]);
  });

  it("nennt Bilder beim Zeichnen mit ihrem Namen", () => {
    const { context, calls } = recordingContext();

    context.drawImage(namedImage("wände"), 0, 0, 10, 20);

    expect(calls).toEqual(["drawImage(<wände>, 0, 0, 10, 20)"]);
  });
});

/** Ein Bild, das sich in der Aufzeichnung mit seinem Namen zeigt. */
function namedImage(name: string): CanvasImageSource {
  return { name } as unknown as CanvasImageSource;
}
