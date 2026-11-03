// Prototyp 10: Begrüßung, persönlicher Link und vorgetäuschte Antworten.
//
// Die Antworten sind Lorem ipsum und sagen bewusst nichts über Christian. Es geht nur um
// Länge, Stichwort und Folgefragen, damit man die Aufteilungen beurteilen kann. Später kommen
// sie vom Bot: { text, keyword?, suggestions? } (ADR 0003, Nachtrag 01.11.).

// ---------------------------------------------------------------------------
// Persönlicher Link
// ---------------------------------------------------------------------------

// FNV-1a mit 32 Bit über die Unicode-Zeichen, wie backend/src/bot/domain/personal_link.py.
// Math.imul multipliziert wie in C mit 32 Bit; ">>> 0" macht daraus wieder eine Zahl ohne Vorzeichen.
function fnv1a(text) {
  let wert = 0x811c9dc5;
  for (const zeichen of text) {
    wert ^= zeichen.codePointAt(0);
    wert = Math.imul(wert, 0x01000193) >>> 0;
  }
  return wert;
}

// Die ersten 4 Hex-Ziffern von FNV-1a über "Nummer|Name".
function pruefsumme(nummer, name) {
  return fnv1a(`${nummer}|${name}`).toString(16).padStart(8, "0").slice(0, 4);
}

// Liest den Teil hinter "#": base64url von "Nummer|Name|Prüfsumme".
// Liefert { art: "keiner" }, { art: "kaputt" } oder { art: "gueltig", nummer, name }.
function lesePersoenlichenLink(fragment) {
  const roh = fragment.replace(/^#/, "");
  if (roh === "") return { art: "keiner" };
  try {
    const base64 = roh.replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(base64), (zeichen) => zeichen.charCodeAt(0));
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    const teile = text.split("|");
    if (teile.length < 3) return { art: "kaputt" };
    const nummer = teile[0];
    const summe = teile[teile.length - 1];
    const name = teile.slice(1, -1).join("|");
    if (!/^\d+$/.test(nummer) || name === "" || summe !== pruefsumme(nummer, name)) return { art: "kaputt" };
    return { art: "gueltig", nummer: Number(nummer), name };
  } catch {
    return { art: "kaputt" };
  }
}

// ---------------------------------------------------------------------------
// Begrüßung
// ---------------------------------------------------------------------------

// Kann die Labyrinth-Schrift jedes Zeichen des Namens schreiben?
function schriftKannNamen(name) {
  return [...name.toUpperCase()].every((zeichen) => zeichen === " " || GLYPHS[zeichen]);
}

// Das Stichwort der Begrüßung. Aus "Frau Erika Muster" wird "HALLO FRAU MUSTER": Anrede und
// Nachname reichen, mit Vornamen wären es auf dem Desktop neben dem Lebenslauf vier Zeilen.
function stichwortDerBegruessung(link) {
  if (link.art !== "gueltig" || !schriftKannNamen(link.name)) return "HALLO";
  const woerter = link.name.trim().split(/\s+/);
  const hatAnrede = ["frau", "herr"].includes(woerter[0].toLowerCase());
  const kurz = hatAnrede && woerter.length > 2 ? [woerter[0], woerter[woerter.length - 1]] : woerter;
  return "HALLO " + kurz.join(" ");
}

// Entwurf des Begrüßungstexts (Q19): Christian gibt ihn frei.
function textDerBegruessung(link) {
  const anrede = link.art === "gueltig" ? `Hallo ${link.name},` : "Hallo,";
  const absaetze = [
    anrede,
    "schön, dass Sie vorbeischauen. Hier können Sie Chris ausfragen: Tippen Sie unten eine Frage " +
      "ein, ein Chatbot antwortet. Er beantwortet auch allgemeine Fragen, vor allem aber Fragen " +
      "zu Chris – zu seinem Werdegang, seinen Projekten und wie er arbeitet.",
    "Im Lebenslauf genügt ein Klick auf einen Stichpunkt: Dann steht eine passende Frage im " +
      "Eingabefeld, die Sie noch ändern können. Den Lebenslauf öffnen Sie jederzeit über den " +
      "Reiter „Lebenslauf“.",
  ];
  if (link.art === "kaputt") {
    absaetze.push(
      "Ihr Link sollte diese Seite eigentlich für Sie persönlich einrichten. Das hat leider nicht " +
        "geklappt – alles andere funktioniert aber ganz normal."
    );
  }
  return absaetze;
}

// ---------------------------------------------------------------------------
// Vorgetäuschter Bot
// ---------------------------------------------------------------------------

const LOREM =
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut " +
  "labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco " +
  "laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in " +
  "voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat " +
  "non proident, sunt in culpa qui officia deserunt mollit anim id est laborum. Sed ut perspiciatis " +
  "unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam.";

// Ein Stück Lorem ipsum, das an einem Wortende vor `zeichen` aufhört und mit Punkt endet.
function loremMitLaenge(zeichen) {
  const stueck = LOREM.slice(0, zeichen);
  return stueck.slice(0, stueck.lastIndexOf(" ")).replace(/[,.]$/, "") + ".";
}

const FOLGEFRAGEN_BEISPIELE = [
  "Wie lange arbeitet Chris schon mit TypeScript?",
  "Welche Vorträge hat Chris schon gehalten?",
  "Was macht Chris, wenn er gerade nicht programmiert?",
  "Wie geht Chris an ein Projekt heran, das schon in Schieflage ist, und was hat er dabei in den letzten Jahren gelernt?",
];

// Die Antworten kommen der Reihe nach, egal was gefragt wird: So sieht man nacheinander
// verschiedene Längen, Stichwörter und eine Antwort ohne Stichwort.
// Stichwörter nur mit Zeichen der Labyrinth-Schrift von Prototyp 6 (kein "+").
const VORGETAEUSCHTE_ANTWORTEN = [
  { keyword: "KAFKA", text: loremMitLaenge(200), suggestions: FOLGEFRAGEN_BEISPIELE.slice(0, 2) },
  { keyword: "SPRACH|ERKEN|NUNG", text: loremMitLaenge(320), suggestions: FOLGEFRAGEN_BEISPIELE.slice(1, 4) },
  { keyword: null, text: "Allgemeine Antwort ohne Stichwort: " + loremMitLaenge(140), suggestions: [] },
  { keyword: "TYPE|SCRIPT", text: loremMitLaenge(400), suggestions: FOLGEFRAGEN_BEISPIELE.slice(0, 1) },
  { keyword: "TESTING STRATEGIES", text: loremMitLaenge(260), suggestions: FOLGEFRAGEN_BEISPIELE.slice(2, 4) },
  { keyword: "NAVI", text: loremMitLaenge(120), suggestions: FOLGEFRAGEN_BEISPIELE.slice(0, 3) },
];

let naechsteVorgetaeuschteAntwort = 0;

// Antwortet nach 0,8 bis 2,2 Sekunden, ungefähr so schnell wie der Bot auf Bedrock.
function frageVorgetaeuschtenBot() {
  const antwort = VORGETAEUSCHTE_ANTWORTEN[naechsteVorgetaeuschteAntwort % VORGETAEUSCHTE_ANTWORTEN.length];
  naechsteVorgetaeuschteAntwort++;
  const wartezeit = 800 + Math.random() * 1400;
  return new Promise((fertig) => setTimeout(() => fertig(antwort), wartezeit));
}
