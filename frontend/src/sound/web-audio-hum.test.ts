import { describe, expect, it } from "vitest";
import { fakeAudioContext } from "../test-support/fake-audio-context";
import { WebAudioHum } from "./web-audio-hum";

const SETTINGS = { humVolume: 0.04, humBaseHertz: 50 };

function setup() {
  const audio = fakeAudioContext();
  let contextsCreated = 0;
  const hum = new WebAudioHum(() => {
    contextsCreated++;
    return audio.context;
  }, SETTINGS);
  return { hum, ...audio, contexts: () => contextsCreated };
}

describe("WebAudioHum", () => {
  it("legt den Ton-Ausgang erst beim Start an, nicht schon beim Bauen", () => {
    const { hum, contexts } = setup();

    expect(contexts()).toBe(0);
    hum.start();
    expect(contexts()).toBe(1);
  });

  describe("start", () => {
    it("baut Grundton und zwei Obertöne mit abnehmender Stärke durch einen stummen Regler zum Ausgang und blendet dann ein", () => {
      const { hum, calls } = setup();

      hum.start();

      expect(calls).toEqual([
        "createGain -> Verstärker 1",
        "Verstärker 1.gain.value = 0",
        "Verstärker 1.connect(Ausgang)",
        ...[1, 2, 3].flatMap((multiple, index) => [
          `createOscillator -> Oszillator ${String(multiple)}`,
          `Oszillator ${String(multiple)}.type = sine`,
          `Oszillator ${String(multiple)}.frequency.value = ${String(50 * multiple)}`,
          `createGain -> Verstärker ${String(multiple + 1)}`,
          `Verstärker ${String(multiple + 1)}.gain.value = ${String([1, 0.7, 0.5][index])}`,
          `Oszillator ${String(multiple)}.connect(Verstärker ${String(multiple + 1)})`,
          `Verstärker ${String(multiple + 1)}.connect(Verstärker 1)`,
          `Oszillator ${String(multiple)}.start()`,
        ]),
        "resume()",
        "Verstärker 1.gain.setTargetAtTime(0.04, 0, 0.1)",
      ]);
    });

    it("baut die Anlage nur beim ersten Mal", () => {
      const { hum, calls, contexts } = setup();
      hum.start();
      hum.stop();
      calls.length = 0;

      hum.start();

      expect(contexts()).toBe(1);
      expect(calls).toEqual(["resume()", "Verstärker 1.gain.setTargetAtTime(0.04, 0, 0.1)"]);
    });
  });

  describe("stop", () => {
    it("blendet weich aus, ohne die Töne abzuschalten", () => {
      const { hum, calls, setTime } = setup();
      hum.start();
      calls.length = 0;
      setTime(4);

      hum.stop();

      expect(calls).toEqual(["Verstärker 1.gain.setTargetAtTime(0, 4, 0.1)"]);
    });
  });

  describe("mute", () => {
    it("blendet für die Dauer des Verstummens aus und danach wieder auf die Lautstärke ein", () => {
      const { hum, calls, setTime } = setup();
      hum.start();
      calls.length = 0;

      setTime(1);
      hum.mute(true);
      setTime(2);
      hum.mute(false);

      expect(calls).toEqual([
        "Verstärker 1.gain.setTargetAtTime(0, 1, 0.1)",
        "Verstärker 1.gain.setTargetAtTime(0.04, 2, 0.1)",
      ]);
    });

    it("bleibt nach dem Ausschalten stumm, auch wenn das Verstummen endet", () => {
      const { hum, calls } = setup();
      hum.start();
      hum.mute(true);
      hum.stop();
      calls.length = 0;

      hum.mute(false);

      expect(calls).toEqual(["Verstärker 1.gain.setTargetAtTime(0, 0, 0.1)"]);
    });
  });

  describe("tune", () => {
    it("lässt Grundton und Obertöne langsam zur neuen Frequenz und die Lautstärke zum neuen Pegel gleiten", () => {
      const { hum, calls, setTime } = setup();
      hum.start();
      calls.length = 0;
      setTime(3);

      hum.tune({ frequency: 51, level: 0.5 });

      expect(calls).toEqual([
        "Oszillator 1.frequency.setTargetAtTime(51, 3, 1)",
        "Oszillator 2.frequency.setTargetAtTime(102, 3, 1)",
        "Oszillator 3.frequency.setTargetAtTime(153, 3, 1)",
        "Verstärker 1.gain.setTargetAtTime(0.02, 3, 1)",
      ]);
    });

    it("hält die Lautstärke bei 0, solange es verstummt ist", () => {
      const { hum, calls } = setup();
      hum.start();
      hum.mute(true);
      calls.length = 0;

      hum.tune({ frequency: 51, level: 0.5 });

      expect(calls.at(-1)).toBe("Verstärker 1.gain.setTargetAtTime(0, 0, 1)");
    });

    it("merkt sich den Pegel für das Einblenden nach dem Verstummen", () => {
      const { hum, calls } = setup();
      hum.start();
      hum.tune({ frequency: 51, level: 0.5 });
      hum.mute(true);
      calls.length = 0;

      hum.mute(false);

      expect(calls).toEqual(["Verstärker 1.gain.setTargetAtTime(0.02, 0, 0.1)"]);
    });
  });

  it.each([
    [
      "stop",
      (hum: WebAudioHum) => {
        hum.stop();
      },
    ],
    [
      "tune",
      (hum: WebAudioHum) => {
        hum.tune({ frequency: 50, level: 1 });
      },
    ],
    [
      "mute",
      (hum: WebAudioHum) => {
        hum.mute(true);
      },
    ],
  ])("meldet einen Fehler, wenn %s vor dem Start aufgerufen wird", (_name, call) => {
    const { hum } = setup();

    expect(() => {
      call(hum);
    }).toThrow("Das Brummen wurde noch nicht gestartet");
  });
});
