import { REPLACEMENT_CHARACTER } from "../font/font";
import type { Font } from "../font/font";
import { BREAK_MARK } from "./break-marks";

const INVISIBLE_ONLY = /^[\p{White_Space}\p{Cc}\p{Cf}]+$/u;
const WHITESPACE = /\p{White_Space}/u;
const IGNORABLE_MARKS = /[\p{M}\p{Cf}\p{Cc}]/gu;
/**
 * Zeichen, die als Ganzes durch darstellbaren Text ersetzt werden. Die Hochzahlen bekommen ein
 * Leerzeichen davor und danach (x²y wird X HOCH 2 Y); doppelte Leerzeichen und Leerzeichen an den
 * Enden entfernt `normalize` danach.
 */
const REPLACEMENTS: ReadonlyMap<string, string> = new Map([
  [",", " "],
  [";", " "],
  [":", " "],
  ["²", " HOCH 2 "],
  ["³", " HOCH 3 "],
  ["–", "-"], // Halbgeviertstrich
  ["—", "-"], // Geviertstrich
  ["…", "..."],
]);
/** Eine Raute direkt nach einem Buchstaben wird ausgeschrieben: F# wird F SHARP. */
const SHARP = "#";
const SHARP_SPELLED_OUT = " SHARP";
const STARTS_WITH_LETTER = /^\p{L}/u;

/**
 * Text aus druckbarem ASCII und den lateinischen Buchstaben von À bis ÿ: Hier ist jedes Zeichen
 * für sich ein Graphem (nichts davon hängt sich an ein Nachbarzeichen an).
 */
const ONE_CHARACTER_PER_GRAPHEME = /^[\u0020-\u007e\u00c0-\u00ff]*$/;

/**
 * Macht aus beliebigem Text einen Text, den die Schrift darstellen kann.
 *
 * Der Text wird Graphem für Graphem (so, wie ein Mensch Zeichen zählt) aufbereitet:
 * - Großschreibung; ß wird SS.
 * - Akzentbuchstaben werden zum Grundbuchstaben (É wird E), Umlaute bleiben.
 * - Komma, Semikolon und Doppelpunkt werden Leerzeichen.
 * - Hochgestellte 2 und 3 werden "HOCH 2" und "HOCH 3", Halbgeviert- und Geviertstrich werden
 *   Bindestriche, Auslassungspunkte werden drei Punkte.
 * - Eine Raute direkt nach einem Buchstaben wird " SHARP" (F# wird F SHARP).
 * - Leerraum wird ein Leerzeichen; unsichtbare Steuer- und Formatzeichen entfallen.
 * - Trennstellen-Zeichen bleiben bis zum Umbruch erhalten.
 * - Jedes übrige Graphem wird genau eine Ersatzglyphe, und die unbekannten Zeichen werden gemeldet.
 * - Bleibt nichts Sichtbares übrig, ist das Ergebnis ein Fragezeichen.
 */
export class TextNormalizer {
  // Der Zerleger kostet beim Anlegen einige Millisekunden (er lädt Unicode-Daten). Aus Leistungs-
  // gründen entsteht er erst, wenn ein Text ihn wirklich braucht; die Begrüßung braucht ihn nicht.
  private segmenter: Intl.Segmenter | undefined;

  /**
   * @param font bestimmt, was darstellbar ist
   * @param reportUnknown wird einmal je Aufruf mit allen unbekannten Zeichen aufgerufen
   */
  public constructor(
    private readonly font: Font,
    private readonly reportUnknown: (characters: readonly string[]) => void,
  ) {}

  public normalize(text: string): string {
    const unknownCharacters: string[] = [];
    const normalized = this.graphemesOf(text)
      .map((grapheme, index, graphemes) =>
        this.normalizeGrapheme(grapheme, graphemes[index - 1], unknownCharacters),
      )
      .join("")
      .replace(/ +/g, " ")
      .trim();

    if (unknownCharacters.length > 0) this.reportUnknown(unknownCharacters);
    return /[^ |]/.test(normalized) ? normalized : "?";
  }

  private graphemesOf(text: string): string[] {
    if (ONE_CHARACTER_PER_GRAPHEME.test(text)) return Array.from(text);

    this.segmenter ??= new Intl.Segmenter();
    return [...this.segmenter.segment(text)].map(({ segment }) => segment);
  }

  private normalizeGrapheme(
    grapheme: string,
    previousGrapheme: string | undefined,
    unknownCharacters: string[],
  ): string {
    if (INVISIBLE_ONLY.test(grapheme)) return WHITESPACE.test(grapheme) ? " " : "";
    if (grapheme === SHARP && STARTS_WITH_LETTER.test(previousGrapheme ?? "")) {
      return SHARP_SPELLED_OUT;
    }
    const replacement = REPLACEMENTS.get(grapheme);
    if (replacement !== undefined) return replacement;

    const upperCase = grapheme.normalize("NFC").toUpperCase();
    if (this.isDrawable(upperCase) || upperCase === BREAK_MARK) return upperCase;

    // Akzente und angehängte unsichtbare Zeichen fallen weg, der Grundbuchstabe bleibt.
    const baseLetters = upperCase.normalize("NFD").replace(IGNORABLE_MARKS, "");
    if (baseLetters !== "" && this.isDrawable(baseLetters)) return baseLetters;

    unknownCharacters.push(grapheme);
    return REPLACEMENT_CHARACTER;
  }

  private isDrawable(text: string): boolean {
    return Array.from(text).every((character) => this.font.hasGlyph(character));
  }
}
