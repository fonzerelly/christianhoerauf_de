import { describe, expect, it } from "vitest";
import { HumControl } from "./hum-control";
import type { HumWandering } from "./hum-control";
import type { HumSound, HumTuning } from "./hum-sound";

/** Ein Ton, der nur aufschreibt, was man ihm sagt. */
class RecordingSound implements HumSound {
  public readonly calls: string[] = [];

  public start(): void {
    this.calls.push("start");
  }
  public stop(): void {
    this.calls.push("stop");
  }
  public tune(tuning: HumTuning): void {
    this.calls.push(`tune ${String(tuning.frequency)} Hz, ${String(tuning.level)}`);
  }
  public mute(isMuted: boolean): void {
    this.calls.push(`mute ${String(isMuted)}`);
  }
}

/** Wanderwerte von Hand: `next` ist das Ziel, das `advance` beim nächsten Mal meldet. */
class FakeWandering implements HumWandering {
  public current: HumTuning = { frequency: 50, level: 0.75 };
  public next: HumTuning | undefined;
  public readonly advances: number[] = [];

  public advance(seconds: number): HumTuning | undefined {
    this.advances.push(seconds);
    const target = this.next;
    this.next = undefined;
    return target;
  }
}

function setup() {
  const sound = new RecordingSound();
  const wandering = new FakeWandering();
  return { control: new HumControl(sound, wandering), sound, wandering };
}

describe("HumControl", () => {
  describe("Ein- und Ausschalten", () => {
    it("ist beim Laden aus und macht nichts, solange es aus ist", () => {
      const { control, sound, wandering } = setup();

      control.update(0.1, false);
      control.update(0.1, true);

      expect(control.isOn).toBe(false);
      expect(sound.calls).toEqual([]);
      expect(wandering.advances).toEqual([]);
    });

    it("startet beim Einschalten mit den aktuellen Wanderwerten", () => {
      const { control, sound } = setup();

      const isOn = control.toggle();

      expect(isOn).toBe(true);
      expect(control.isOn).toBe(true);
      expect(sound.calls).toEqual(["start", "tune 50 Hz, 0.75", "mute false"]);
    });

    it("hört beim Ausschalten auf", () => {
      const { control, sound } = setup();
      control.toggle();
      sound.calls.length = 0;

      const isOn = control.toggle();

      expect(isOn).toBe(false);
      expect(control.isOn).toBe(false);
      expect(sound.calls).toEqual(["stop"]);
    });

    it("beginnt nach erneutem Einschalten wieder mit Anlauf, Wanderwerten und dem Stand von Störung und Hintergrund", () => {
      const { control, sound } = setup();
      control.toggle();
      control.update(0.1, true);
      control.toggle();
      sound.calls.length = 0;

      control.toggle();

      expect(sound.calls).toEqual(["start", "tune 50 Hz, 0.75", "mute true"]);
    });
  });

  describe("update", () => {
    it("lässt das Brummen wandern, wenn ein neues Ziel fällig ist, und gibt die vergangene Zeit weiter", () => {
      const { control, sound, wandering } = setup();
      control.toggle();
      sound.calls.length = 0;

      control.update(0.1, false);
      wandering.next = { frequency: 50.2, level: 0.6 };
      control.update(0.2, false);

      expect(wandering.advances).toEqual([0.1, 0.2]);
      expect(sound.calls).toEqual(["tune 50.2 Hz, 0.6"]);
    });

    it("verstummt, solange eine Bildstörung läuft, und kommt danach zurück - je einmal gemeldet", () => {
      const { control, sound } = setup();
      control.toggle();
      sound.calls.length = 0;

      control.update(0.1, true);
      control.update(0.1, true);
      control.update(0.1, false);
      control.update(0.1, false);

      expect(sound.calls).toEqual(["mute true", "mute false"]);
    });
  });

  describe("pageVisibilityChanged", () => {
    it("verstummt im Hintergrund und kommt beim Zurückkehren wieder", () => {
      const { control, sound } = setup();
      control.toggle();
      sound.calls.length = 0;

      control.pageVisibilityChanged(false);
      control.pageVisibilityChanged(true);

      expect(sound.calls).toEqual(["mute true", "mute false"]);
    });

    it("bleibt still, wenn die Seite zurückkommt, während noch eine Bildstörung läuft", () => {
      const { control, sound } = setup();
      control.toggle();
      control.update(0.1, true);
      control.pageVisibilityChanged(false);
      sound.calls.length = 0;

      control.pageVisibilityChanged(true);

      expect(sound.calls).toEqual([]);
    });

    it("sagt dem Ton nichts, solange das Brummen aus ist, merkt sich aber den Stand", () => {
      const { control, sound } = setup();

      control.pageVisibilityChanged(false);
      expect(sound.calls).toEqual([]);
      control.toggle();

      expect(sound.calls).toEqual(["start", "tune 50 Hz, 0.75", "mute true"]);
    });
  });
});
