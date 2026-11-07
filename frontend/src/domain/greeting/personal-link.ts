/**
 * Der persönliche Link aus den Unterlagen einer Bewerbung (Backend: `bot/domain/personal_link.py`).
 * Hinter `#` steht base64url von „Variantennummer|Ansprechpartner|Prüfsumme“. Den Teil hinter `#`
 * schickt der Browser an keinen Server; der Name bleibt im Browser. Die Prüfsumme erkennt nur
 * abgeschnittene oder verstümmelte Links, ein Geheimnis schützt sie nicht.
 */

/** Was hinter `#` in der Adresse steht: kein persönlicher Link, ein kaputter oder ein gültiger. */
export type PersonalLink =
  | { readonly kind: "none" }
  | { readonly kind: "broken" }
  | { readonly kind: "valid"; readonly variant: number; readonly name: string };

const SEPARATOR = "|";
const FNV_OFFSET = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

/**
 * FNV-1a mit 32 Bit über die Unicode-Zeichen (Codepoints, wie Python), nicht über UTF-16-Einheiten.
 * `Math.imul` multipliziert wie in C mit 32 Bit; `>>> 0` macht daraus wieder eine Zahl ohne
 * Vorzeichen.
 */
export function fnv1a(text: string): number {
  let value = FNV_OFFSET;
  for (const character of text) {
    // „for … of“ liefert ganze Zeichen, nie ein leeres: An Stelle 0 steht immer ein Codepoint.
    // `Number` macht für TypeScript aus „Zahl oder undefined“ eine Zahl.
    value ^= Number(character.codePointAt(0));
    value = Math.imul(value, FNV_PRIME) >>> 0;
  }
  return value;
}

/** Die ersten 4 Hex-Ziffern von FNV-1a über „Nummer|Name“. */
export function checksumOf(variant: number, name: string): string {
  return fnv1a(`${String(variant)}${SEPARATOR}${name}`)
    .toString(16)
    .padStart(8, "0")
    .slice(0, 4);
}

/** base64url (ohne `=`) zu Text in UTF-8; `undefined`, wenn es kein gültiges base64 oder UTF-8 ist. */
function decodeBase64Url(encoded: string): string | undefined {
  try {
    const base64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return undefined;
  }
}

/**
 * Liest den Teil hinter `#` (mit oder ohne `#`). Leer: kein Link. Gültig ist er, wenn er sich
 * dekodieren lässt, vorn eine Zahl steht, dazwischen ein Name und hinten die passende Prüfsumme.
 * Ein `|` im Namen schadet nicht: Name ist alles zwischen Nummer und Prüfsumme.
 */
export function readPersonalLink(fragment: string): PersonalLink {
  const encoded = fragment.replace(/^#/, "");
  if (encoded === "") return { kind: "none" };

  const parts = decodeBase64Url(encoded)?.split(SEPARATOR);
  if (parts === undefined || parts.length < 3) return { kind: "broken" };

  const [number = "", ...rest] = parts;
  const checksum = rest.pop();
  const name = rest.join(SEPARATOR);
  if (!/^\d+$/.test(number) || name === "") return { kind: "broken" };

  const variant = Number(number);
  if (checksum !== checksumOf(variant, name)) return { kind: "broken" };
  return { kind: "valid", variant, name };
}
