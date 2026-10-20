/**
 * Holt ein Element der Seite über seine Kennung und prüft seine Art. Fehlt es oder ist es von
 * anderer Art, scheitert der Start der Seite mit einer Meldung, die sagt, was fehlt - statt
 * später an einer unverständlichen Stelle.
 */
export function requireElement<Element extends object>(
  root: { getElementById(id: string): unknown },
  id: string,
  type: new () => Element,
): Element {
  const element = root.getElementById(id);
  if (element === null || element === undefined) {
    throw new Error(`Auf der Seite fehlt das Element "${id}"`);
  }
  if (!(element instanceof type)) {
    throw new Error(`Das Element "${id}" ist von der falschen Art`);
  }
  return element;
}
