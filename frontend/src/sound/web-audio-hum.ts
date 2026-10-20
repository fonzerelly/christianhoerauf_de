import type { AudioContextFactory, AudioContextLike } from "./audio-context";
import type { HumSettings } from "./hum-settings";
import type { HumSound, HumTuning } from "./hum-sound";

/**
 * Grundton und Obertöne: Vielfaches des Grundtons und Stärke. Laptop-Lautsprecher geben 50 Hz
 * kaum wieder; die Obertöne bei 100 und 150 Hz sind es, die man hört.
 */
const PARTIALS = [
  { multiple: 1, strength: 1 },
  { multiple: 2, strength: 0.7 },
  { multiple: 3, strength: 0.5 },
] as const;

/** Zeitkonstante (Sekunden) für Ein-, Ausblenden und Verstummen: Nach dem Dreifachen ist der Zielwert fast erreicht. */
const FADE_SECONDS = 0.1;
/** Zeitkonstante für das langsame Wandern von Frequenz und Lautstärke. */
const DRIFT_SECONDS = 1;

/** Die aufgebaute Tonanlage. */
interface Graph {
  readonly context: AudioContextLike;
  /** Der gemeinsame Lautstärkeregler vor dem Ausgang. */
  readonly master: GainNode;
  /** Die Sinustöne, in der Reihenfolge von `PARTIALS`. */
  readonly oscillators: readonly OscillatorNode[];
}

/**
 * Das Brummen mit Web Audio: drei Sinustöne (Grundton und zwei Obertöne) durch einen gemeinsamen
 * Lautstärkeregler. Es kommt ohne Tondatei aus. Der Ton-Ausgang entsteht erst beim ersten `start`,
 * denn Browser erlauben Ton erst nach einem Klick.
 */
export class WebAudioHum implements HumSound {
  private graph: Graph | undefined;
  private isOn = false;
  private isMuted = false;
  /** Pegel von 0 bis 1 relativ zu `humVolume`, wie zuletzt eingestellt. */
  private level = 1;

  public constructor(
    private readonly createContext: AudioContextFactory,
    private readonly settings: Pick<HumSettings, "humVolume" | "humBaseHertz">,
  ) {}

  public start(): void {
    this.graph ??= this.buildGraph();
    void this.graph.context.resume();
    this.isOn = true;
    this.applyGain(FADE_SECONDS);
  }

  public stop(): void {
    this.requireGraph();
    this.isOn = false;
    this.applyGain(FADE_SECONDS);
  }

  public tune(tuning: HumTuning): void {
    const { context, oscillators } = this.requireGraph();
    PARTIALS.forEach(({ multiple }, index) => {
      oscillators[index]?.frequency.setTargetAtTime(
        tuning.frequency * multiple,
        context.currentTime,
        DRIFT_SECONDS,
      );
    });
    this.level = tuning.level;
    this.applyGain(DRIFT_SECONDS);
  }

  public mute(isMuted: boolean): void {
    this.requireGraph();
    this.isMuted = isMuted;
    this.applyGain(FADE_SECONDS);
  }

  private requireGraph(): Graph {
    if (this.graph === undefined) throw new Error("Das Brummen wurde noch nicht gestartet");
    return this.graph;
  }

  /** Baut die Anlage: Jeder Ton geht durch einen Regler für seine Stärke in den gemeinsamen Regler, der still beginnt. */
  private buildGraph(): Graph {
    const context = this.createContext();
    const master = context.createGain();
    master.gain.value = 0;
    master.connect(context.destination);

    const oscillators = PARTIALS.map(({ multiple, strength }) => {
      const oscillator = context.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.value = this.settings.humBaseHertz * multiple;
      const partial = context.createGain();
      partial.gain.value = strength;
      oscillator.connect(partial);
      partial.connect(master);
      oscillator.start();
      return oscillator;
    });
    return { context, master, oscillators };
  }

  /** Lässt die Lautstärke weich zu dem Wert gleiten, der jetzt gelten soll (0, wenn aus oder verstummt). */
  private applyGain(timeConstant: number): void {
    const { context, master } = this.requireGraph();
    const volume = this.isOn && !this.isMuted ? this.settings.humVolume * this.level : 0;
    master.gain.setTargetAtTime(volume, context.currentTime, timeConstant);
  }
}
