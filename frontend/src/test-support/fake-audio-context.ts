import type { AudioContextLike } from "../sound/audio-context";

/**
 * Eine Attrappe für den Ton-Ausgang: schreibt jeden Aufruf (`Oszillator 1.frequency.setTargetAtTime(50, 0, 1)`)
 * und jede gesetzte Eigenschaft (`Verstärker 1.gain.value = 0`) in der Reihenfolge auf, in der sie geschehen.
 * Knoten haben Namen mit Nummer; die Uhr (`currentTime`) stellt der Test von Hand.
 */
export function fakeAudioContext(): {
  context: AudioContextLike;
  calls: string[];
  setTime: (seconds: number) => void;
} {
  const calls: string[] = [];
  let time = 0;
  let oscillators = 0;
  let gains = 0;

  /** Ein Parameter eines Knotens (Frequenz, Verstärkung): Setzen und sanftes Gleiten werden aufgezeichnet. */
  const parameter = (name: string) => ({
    set value(value: number) {
      calls.push(`${name}.value = ${String(value)}`);
    },
    setTargetAtTime: (target: number, startTime: number, timeConstant: number) => {
      calls.push(
        `${name}.setTargetAtTime(${String(target)}, ${String(startTime)}, ${String(timeConstant)})`,
      );
    },
  });

  /** Gemeinsamer Teil der Knoten: Name, Verbinden. */
  const node = (name: string) => ({
    name,
    connect: (target: { name: string }) => {
      calls.push(`${name}.connect(${target.name})`);
    },
  });

  const context = {
    get currentTime() {
      return time;
    },
    destination: { name: "Ausgang" },
    createOscillator: () => {
      oscillators++;
      const name = `Oszillator ${String(oscillators)}`;
      calls.push(`createOscillator -> ${name}`);
      return {
        ...node(name),
        set type(type: string) {
          calls.push(`${name}.type = ${type}`);
        },
        frequency: parameter(`${name}.frequency`),
        start: () => {
          calls.push(`${name}.start()`);
        },
      };
    },
    createGain: () => {
      gains++;
      const name = `Verstärker ${String(gains)}`;
      calls.push(`createGain -> ${name}`);
      return { ...node(name), gain: parameter(`${name}.gain`) };
    },
    resume: () => {
      calls.push("resume()");
      return Promise.resolve();
    },
  } as unknown as AudioContextLike;

  return {
    context,
    calls,
    setTime: (seconds) => {
      time = seconds;
    },
  };
}
