import { describe, expect, it } from "vitest";
import { connectSoundToggle } from "./sound-toggle";

function fakeButton() {
  let click: () => void = () => undefined;
  const attributes = new Map<string, string>();
  return {
    button: {
      addEventListener: (_type: string, listener: () => void) => {
        click = listener;
      },
      setAttribute: (name: string, value: string) => {
        attributes.set(name, value);
      },
    },
    click: () => {
      click();
    },
    attributes,
  };
}

describe("connectSoundToggle", () => {
  it("schaltet bei jedem Klick um und zeigt den neuen Zustand in aria-pressed", () => {
    const { button, click, attributes } = fakeButton();
    let isOn = false;
    connectSoundToggle(button, () => {
      isOn = !isOn;
      return isOn;
    });

    click();
    expect(attributes.get("aria-pressed")).toBe("true");
    click();
    expect(attributes.get("aria-pressed")).toBe("false");
  });

  it("verändert den Knopf nicht, solange niemand klickt", () => {
    const { button, attributes } = fakeButton();

    connectSoundToggle(button, () => true);

    expect(attributes.size).toBe(0);
  });
});
