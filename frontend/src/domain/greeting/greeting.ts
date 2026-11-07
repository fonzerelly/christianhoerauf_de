import { lastOf } from "../lists";
import type { PersonalLink } from "./personal-link";

const HELLO = "Hallo";
const FORMS_OF_ADDRESS = ["frau", "herr"];

/**
 * Anrede und Nachname aus dem Namen im persönlichen Link: aus „Frau Erika Muster“ wird
 * „Frau Muster“ (das letzte Wort gilt als Nachname). Ohne Anrede vorn bleibt der Name, wie er ist
 * („Team Personal“), nur mit einfachen Leerzeichen.
 */
export function addressAndSurname(name: string): string {
  const words = name.trim().split(/\s+/);
  const [first = "", ...rest] = words;
  const hasAddress = FORMS_OF_ADDRESS.includes(first.toLowerCase());
  return hasAddress && rest.length > 1 ? `${first} ${lastOf(rest)}` : words.join(" ");
}

export interface GreetingKeywordOptions {
  /** Desktop: „Hallo“ in der ersten Zeile; Handy: nur der Name. */
  readonly withHello: boolean;
  /** Kann die Labyrinth-Schrift diesen Text schreiben (jedes Zeichen)? */
  readonly canWrite: (text: string) => boolean;
}

/**
 * Das Stichwort der Begrüßung. Mit gültigem Link Anrede und Nachname, am Desktop mit „Hallo“
 * davor in einer eigenen Zeile (`\n` ist ein erzwungener Umbruch). Ohne gültigen Link, oder wenn
 * die Schrift ein Zeichen des Namens nicht kennt: nur „Hallo“.
 */
export function greetingKeyword(link: PersonalLink, options: GreetingKeywordOptions): string {
  if (link.kind !== "valid") return HELLO;
  const short = addressAndSurname(link.name);
  if (!options.canWrite(short)) return HELLO;
  return options.withHello ? `${HELLO}\n${short}` : short;
}

/**
 * Der Text der Begrüßung als Absätze: die Anrede (mit gültigem Link der volle Name), was die Seite
 * kann, wie die Zeitleiste hilft; bei kaputtem Link ein Satz dazu. Entwurf aus Prototyp 12,
 * Christian gibt den Wortlaut frei.
 */
export function greetingParagraphs(link: PersonalLink): string[] {
  const paragraphs = [
    link.kind === "valid" ? `${HELLO} ${link.name},` : `${HELLO},`,
    "schön, dass Sie vorbeischauen. Hier können Sie Chris ausfragen: Ein Chatbot antwortet auf " +
      "Ihre Fragen, und zwar nur aus Chris' eigenen Unterlagen.",
    "Ein Klick auf eine Station der Zeitleiste schlägt passende Fragen vor. Die gewählte Frage " +
      "steht dann im Eingabefeld, und Sie können sie noch ändern, bevor Sie sie abschicken.",
  ];
  if (link.kind === "broken") {
    paragraphs.push(
      "Ihr Link sollte diese Seite eigentlich für Sie persönlich einrichten. Das hat leider nicht " +
        "geklappt – alles andere funktioniert aber ganz normal.",
    );
  }
  return paragraphs;
}
