import { describe, expect, it } from "vitest";
import { requireElement } from "./required-element";

class Button {
  public readonly kind = "Knopf";
}
class Input {
  public readonly kind = "Eingabefeld";
}

describe("requireElement", () => {
  it("liefert das Element mit der Kennung, wenn es von der erwarteten Art ist", () => {
    const button = new Button();

    expect(requireElement({ getElementById: () => button }, "send", Button)).toBe(button);
  });

  it("fragt nach der Kennung", () => {
    const asked: string[] = [];
    const root = {
      getElementById: (id: string) => {
        asked.push(id);
        return new Button();
      },
    };

    requireElement(root, "send", Button);

    expect(asked).toEqual(["send"]);
  });

  it("scheitert mit einer lesbaren Meldung, wenn es das Element nicht gibt", () => {
    expect(() => requireElement({ getElementById: () => null }, "send", Button)).toThrow(
      'Auf der Seite fehlt das Element "send"',
    );
  });

  it("scheitert, wenn das Element von einer anderen Art ist", () => {
    expect(() => requireElement({ getElementById: () => new Input() }, "send", Button)).toThrow(
      'Das Element "send" ist von der falschen Art',
    );
  });
});
