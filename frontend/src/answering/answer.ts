/**
 * Ein Zusatz zur Antwort, den das Frontend über den Text hinaus darstellen kann (etwa eine
 * Wetterkarte). `type` sagt, welcher es ist; die übrigen Felder gehören zu diesem Typ.
 */
export interface Gimmick {
  readonly type: string;
  readonly [field: string]: unknown;
}

/**
 * Die Antwort auf eine Frage. `text` ist immer da. Ein `gimmick` zeigt das Frontend nur, wenn es
 * dessen `type` kennt; sonst schreibt es nur den Text (ADR 0003, Nachtrag).
 */
export interface Answer {
  readonly text: string;
  readonly gimmick?: Gimmick;
}
