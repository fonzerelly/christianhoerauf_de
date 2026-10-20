import { describe, expect, it } from "vitest";
import { connectReplayButton } from "./replay-button";

describe("connectReplayButton", () => {
  it("meldet jeden Klick", () => {
    let click: () => void = () => undefined;
    const button = {
      addEventListener: (_type: string, listener: () => void) => {
        click = listener;
      },
    };
    let replays = 0;
    connectReplayButton(button, () => {
      replays++;
    });

    click();
    click();

    expect(replays).toBe(2);
  });
});
