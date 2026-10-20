/** Der Teil von `fetch`, den die Seite braucht. */
export type FetchFunction = (url: string) => Promise<{
  readonly ok: boolean;
  readonly status: number;
  json(): Promise<unknown>;
}>;

/** Holt eine Adresse und liefert ihren JSON-Inhalt. Scheitert mit Adresse und Status, wenn der Server nicht mit Erfolg antwortet. */
export async function fetchJson(url: string, fetchFunction: FetchFunction): Promise<unknown> {
  const response = await fetchFunction(url);
  if (!response.ok) throw new Error(`${url}: Status ${String(response.status)}`);
  return response.json();
}
