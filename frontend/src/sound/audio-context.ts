/**
 * Der Ton-Ausgang des Browsers, soweit das Brummen ihn braucht: ein schmaler Ausschnitt von
 * `AudioContext`. Der Browser erfüllt ihn; im Test steht eine Attrappe dafür, die jeden Aufruf
 * aufzeichnet (`test-support/fake-audio-context.ts`).
 */
export type AudioContextLike = Pick<
  AudioContext,
  "currentTime" | "destination" | "createOscillator" | "createGain" | "resume"
>;

/** Legt den Ton-Ausgang an. Das darf erst nach einem Klick des Besuchers geschehen (Autoplay-Regeln). */
export type AudioContextFactory = () => AudioContextLike;
