/**
 * Die Uhr der Animation. Sie ist ein Port: Im Browser liefert sie die Zeit des Browsers, im Test
 * eine Uhr, die nur auf Befehl weiterläuft.
 */
export interface Clock {
  /** Die Zeit in Sekunden seit einem beliebigen, aber festen Nullpunkt. */
  now(): number;
}
