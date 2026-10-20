/** Die Abstimmungswerte der Animation. Zeiten in Sekunden, Tempo in Zellen pro Sekunde. */
export interface PlaybackSettings {
  /** Tempo in Schriftwegen. */
  readonly speed: number;
  /** Auf Verbindungswegen und Sprüngen ist der Lichtpunkt so viel mal schneller. */
  readonly connectorSpeedFactor: number;
  /** Im Schnelldurchlauf ist der Lichtpunkt so viel mal schneller. */
  readonly rushFactor: number;
  /** Dauer des Weiterschiebens. */
  readonly scrollSeconds: number;
  /** So lange leuchtet ein gelaufenes Wegstück voll. */
  readonly holdSeconds: number;
  /** Danach blendet es innerhalb dieser Zeit aus. */
  readonly fadeSeconds: number;
  /** Eine volle Schwingung des pulsierenden Lichtpunkts am Haltepunkt dauert so lange. */
  readonly pulseSeconds: number;
  /** Startwert der Begrüßung; jede weitere Antwort zählt eins dazu. */
  readonly seed: number;
}
