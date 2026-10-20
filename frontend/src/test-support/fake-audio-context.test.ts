import { describe, expect, it } from "vitest";
import { fakeAudioContext } from "./fake-audio-context";

describe("fakeAudioContext", () => {
  it("nummeriert Oszillatoren und Verstärker getrennt und zeichnet ihre Anlage auf", () => {
    const { context, calls } = fakeAudioContext();

    context.createOscillator();
    context.createGain();
    context.createOscillator();

    expect(calls).toEqual([
      "createOscillator -> Oszillator 1",
      "createGain -> Verstärker 1",
      "createOscillator -> Oszillator 2",
    ]);
  });

  it("zeichnet Eigenschaften, Verbindungen und Start auf", () => {
    const { context, calls } = fakeAudioContext();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    calls.length = 0;

    oscillator.type = "sine";
    oscillator.frequency.value = 50;
    gain.gain.value = 0.5;
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();

    expect(calls).toEqual([
      "Oszillator 1.type = sine",
      "Oszillator 1.frequency.value = 50",
      "Verstärker 1.gain.value = 0.5",
      "Oszillator 1.connect(Verstärker 1)",
      "Verstärker 1.connect(Ausgang)",
      "Oszillator 1.start()",
    ]);
  });

  it("zeichnet das weiche Gleiten zu einem Zielwert auf", () => {
    const { context, calls } = fakeAudioContext();
    const gain = context.createGain();
    calls.length = 0;

    gain.gain.setTargetAtTime(0.04, 2, 0.1);

    expect(calls).toEqual(["Verstärker 1.gain.setTargetAtTime(0.04, 2, 0.1)"]);
  });

  it("hat eine Uhr, die der Test von Hand stellt, und zeichnet resume auf", async () => {
    const { context, calls, setTime } = fakeAudioContext();
    expect(context.currentTime).toBe(0);

    setTime(2.5);
    await context.resume();

    expect(context.currentTime).toBe(2.5);
    expect(calls).toEqual(["resume()"]);
  });
});
