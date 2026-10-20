/** Wie das Brummen gerade klingen soll. */
export interface HumTuning {
  /** Grundton in Hertz. */
  readonly frequency: number;
  /** Lautstärke als Anteil des Höchstpegels, von 0 bis 1. */
  readonly level: number;
}

/**
 * Der Port zum Ton: Wie das Brummen zu hören ist. `WebAudioHum` erzeugt es mit Web Audio; ein
 * anderer Adapter könnte etwas anderes abspielen. Alle Übergänge sind weich, damit nichts klickt.
 */
export interface HumSound {
  /** Beginnt zu brummen. Das erste Mal legt es den Ton-Ausgang des Browsers an (nur nach einem Klick erlaubt). */
  start(): void;
  /** Hört auf zu brummen (blendet aus). */
  stop(): void;
  /** Stellt Grundton und Lautstärke ein; der Klang gleitet dorthin. */
  tune(tuning: HumTuning): void;
  /** Verstummt (`true`) oder kommt zurück (`false`), ohne dass das Brummen ausgeschaltet wird. */
  mute(isMuted: boolean): void;
}
