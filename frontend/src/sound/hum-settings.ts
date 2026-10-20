/** Die Abstimmungswerte des Brummens (ein Ausschnitt von `Tuning`). */
export interface HumSettings {
  /** Höchster Pegel (Verstärkung von 0 bis 1). */
  readonly humVolume: number;
  /** Grundton in Hertz. */
  readonly humBaseHertz: number;
  /** So weit wandert die Frequenz höchstens vom Grundton weg, in Hertz. */
  readonly humDriftHertz: number;
  /** So leise wird es beim Wandern höchstens, als Anteil des Höchstpegels. */
  readonly humMinLevel: number;
  /** Alle so viele Sekunden gibt es ein neues Ziel für Frequenz und Lautstärke. */
  readonly humDriftSeconds: number;
}
