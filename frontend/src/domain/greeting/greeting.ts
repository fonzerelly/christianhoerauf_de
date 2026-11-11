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
 * Der Text der Begrüßung als Absätze: die Anrede (mit gültigem Link der volle Name, sonst nur
 * „Hallo,“), wer hier antwortet und wie man fragt. Ohne Link und bei kaputtem Link derselbe Text
 * ohne Namen. Wortlaut von Christian.
 */
export function greetingParagraphs(link: PersonalLink): string[] {
  return [
    link.kind === "valid" ? `${HELLO} ${link.name},` : `${HELLO},`,
    "es freut mich, dass Sie den Weg zu mir gefunden haben. Ich bin ChrisBot und kann hoffentlich " +
      "zu allem Auskunft geben, was Sie über Christian Hörauf wissen möchten.",
    "Sie können entweder freie Fragen stellen, oder Sie lassen sich durch die Beispielfragen aus " +
      "dem Werdegang von Herrn Hörauf inspirieren. Klicken Sie dafür einfach auf das Thema aus dem " +
      "Werdegang, das Sie interessiert, und eine passende Frage erscheint im Eingabefeld.",
  ];
}
