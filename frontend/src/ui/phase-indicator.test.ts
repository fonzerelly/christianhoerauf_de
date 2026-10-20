import { describe, expect, it } from "vitest";
import { PhaseIndicator } from "./phase-indicator";

/** Ein Element, das jedes Schreiben von `data-phase` mitzählt. */
function elementWithWriteCount() {
  const writes: string[] = [];
  const dataset = {
    get phase(): string | undefined {
      return writes.at(-1);
    },
    set phase(value: string | undefined) {
      writes.push(String(value));
    },
  };
  return { element: { dataset }, writes };
}

describe("PhaseIndicator", () => {
  it("schreibt den Abschnitt der Animation als data-phase an das Element", () => {
    const { element, writes } = elementWithWriteCount();

    new PhaseIndicator(element).show("resting");

    expect(writes).toEqual(["resting"]);
  });

  it("schreibt nur, wenn sich der Abschnitt ändert, denn es wird in jedem Bild gefragt", () => {
    const { element, writes } = elementWithWriteCount();
    const indicator = new PhaseIndicator(element);

    indicator.show("writing");
    indicator.show("writing");
    indicator.show("resting");
    indicator.show("resting");
    indicator.show("writing");

    expect(writes).toEqual(["writing", "resting", "writing"]);
  });
});
