// Prototyp 11: persönlicher Link, Begrüßung und vorgetäuschter Bot.
//
// Die Antworttexte sind Lorem ipsum und sagen bewusst nichts über Christian (nichts erfinden).
// Es geht nur um Länge, Stichwort, Folgefragen und Fehlerfälle. Die Stichwörter sind dagegen
// realistisch gewählt, auch zu lange wie „NAVIGON HIGHLIGHTS“ (Backend-Plan vom 06.11.).

// ---------------------------------------------------------------------------
// Persönlicher Link (wie Prototyp 10)
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

// Zum Ausprobieren im Bedienfeld: die Beispiele aus backend/schema/personal-link.examples.json.
const BEISPIEL_LINKS = [
  { beschriftung: "ohne Link", fragment: "" },
  { beschriftung: "Frau Erika Muster", fragment: "NDcxMXxGcmF1IEVyaWthIE11c3RlcnxlOWJk" },
  { beschriftung: "Herr Jörg Müßig", fragment: "ODE1fEhlcnIgSsO2cmcgTcO8w59pZ3w0MTQz" },
  { beschriftung: "Team Personal", fragment: "MXxUZWFtIFBlcnNvbmFsfDc3ZmE" },
  { beschriftung: "kaputt", fragment: "NDcxMXxGcmF1IEVyaWthIE11c3Rlcn" },
];

// ---------------------------------------------------------------------------
// Begrüßung (Q16, Q29, Q40)
// ---------------------------------------------------------------------------

// Kann die Labyrinth-Schrift jedes Zeichen des Namens schreiben?
function schriftKannNamen(name) {
  return [...normalisiereFuerSchrift(name)].every((zeichen) => zeichen === " " || GLYPHS[zeichen]);
}

// Großbuchstaben wie in der Schrift; "ß" wird dabei zu "SS".
function normalisiereFuerSchrift(text) {
  return text.toUpperCase();
}

// Anrede und Nachname: aus "Frau Erika Muster" wird "Frau Muster". Ohne Anrede bleibt der
// Name, wie er ist ("Team Personal").
function anredeUndNachname(name) {
  const woerter = name.trim().split(/\s+/);
  const hatAnrede = ["frau", "herr"].includes(woerter[0].toLowerCase());
  return hatAnrede && woerter.length > 2 ? `${woerter[0]} ${woerter[woerter.length - 1]}` : woerter.join(" ");
}

// Das Stichwort der Begrüßung. Desktop: "HALLO", dann in einer neuen Zeile Anrede und Nachname.
// Handy: nur Anrede und Nachname, ohne HALLO. Passt das nicht auf eine Labyrinth-Seite, schiebt
// die Bühne einfach weiter (keine Abkürzung). Nur HALLO, wenn die Schrift ein Zeichen des
// Namens nicht kennt. Der Zeilenumbruch "\n" ist ein erzwungener Umbruch (siehe buehne.js).
function stichwortDerBegruessung(link, profilName) {
  if (link.art !== "gueltig" || !schriftKannNamen(link.name)) return "HALLO";
  const kurz = normalisiereFuerSchrift(anredeUndNachname(link.name));
  return profilName === "handy" ? kurz : "HALLO\n" + kurz;
}

// Entwurf des Begrüßungstexts: die erste Antwort, ohne dass gefragt wurde (Q9).
// Christian gibt den Wortlaut frei.
function textDerBegruessung(link) {
  const anrede = link.art === "gueltig" ? `Hallo ${link.name},` : "Hallo,";
  const absaetze = [
    anrede,
    "schön, dass Sie vorbeischauen. Hier können Sie Chris ausfragen: Ein Chatbot antwortet auf Ihre " +
      "Fragen, und zwar nur aus Chris' eigenen Unterlagen.",
    "Ein Klick auf eine Station der Zeitleiste schlägt passende Fragen vor. Die gewählte Frage steht " +
      "dann im Eingabefeld, und Sie können sie noch ändern, bevor Sie sie abschicken.",
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
  "unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, " +
  "eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.";

// Ein Stück Lorem ipsum, das an einem Wortende vor `zeichen` aufhört und mit Punkt endet.
function loremMitLaenge(zeichen) {
  const stueck = LOREM.slice(0, zeichen);
  return stueck.slice(0, stueck.lastIndexOf(" ")).replace(/[,.]$/, "") + ".";
}

const FOLGEFRAGEN_BEISPIELE = [
  "Wie lange arbeitet Chris schon mit TypeScript?",
  "Welche Vorträge hat Chris schon gehalten?",
  "Was macht Chris, wenn er gerade nicht programmiert?",
  "Warum programmierte Chris bei Navigon in C++?",
];

// Die Antworten kommen der Reihe nach, egal was gefragt wird: So sieht man nacheinander kurze,
// zu lange und fehlende Stichwörter und Texte von 120 bis 600 Zeichen.
// "|" markiert eine Trennstelle, falls das Wort nicht in eine Zeile passt.
const VORGETAEUSCHTE_ANTWORTEN = [
  { keyword: "KAFKA", text: loremMitLaenge(220), suggestions: FOLGEFRAGEN_BEISPIELE.slice(0, 2) },
  { keyword: "NAVIGON HIGHLIGHTS", text: loremMitLaenge(480), suggestions: FOLGEFRAGEN_BEISPIELE.slice(1, 4) },
  { keyword: "TDD", text: loremMitLaenge(160), suggestions: FOLGEFRAGEN_BEISPIELE.slice(2, 3) },
  { keyword: null, text: "Allgemeine Antwort ohne Stichwort: " + loremMitLaenge(140), suggestions: [] },
  { keyword: "TYPE|SCRIPT", text: loremMitLaenge(600), suggestions: FOLGEFRAGEN_BEISPIELE.slice(0, 3) },
  { keyword: "FINANCIAL INFO PAGES", text: loremMitLaenge(320), suggestions: FOLGEFRAGEN_BEISPIELE.slice(3, 4) },
  { keyword: "CODE-KATAS", text: loremMitLaenge(120), suggestions: [] },
];

// Antworten mit Gimmick, ausgelöst über die Knöpfe im Bedienfeld. Das Stichwort schreibt der
// Lichtpunkt nur, wenn das Gimmick nicht auf die Bühne passt.
const GIMMICK_ANTWORTEN = {
  herz: { keyword: "HERZ", gimmick: "herz", text: "Vorgetäuschte Antwort mit dem Herz. " + loremMitLaenge(140), suggestions: [] },
  smiley: { keyword: "SMILEY", gimmick: "smiley", text: "Vorgetäuschte Antwort mit dem Smiley. " + loremMitLaenge(140), suggestions: [] },
  foto: { keyword: "FOTO", gimmick: "foto", text: "Vorgetäuschte Antwort mit dem Foto. " + loremMitLaenge(140), suggestions: [] },
};

// Was im Antwortbereich steht, wenn der Bot nicht erreichbar ist (Q35). Das Labyrinth schreibt
// dazu den HTTP-Code oder OFFLINE bzw. TIMEOUT.
function fehlerAntwort(code) {
  if (code === "OFFLINE") {
    return { keyword: "OFFLINE", text: "Der Bot ist gerade nicht erreichbar. Bitte prüfen Sie Ihre Internetverbindung und versuchen Sie es noch einmal.", suggestions: [] };
  }
  if (code === "TIMEOUT") {
    return { keyword: "TIMEOUT", text: "Der Bot hat zu lange für eine Antwort gebraucht. Bitte versuchen Sie es gleich noch einmal.", suggestions: [] };
  }
  return { keyword: code, text: `Der Bot ist gerade nicht erreichbar (Fehler ${code}). Bitte versuchen Sie es gleich noch einmal.`, suggestions: [] };
}

let naechsteVorgetaeuschteAntwort = 0;

function warte(millisekunden) {
  return new Promise((fertig) => setTimeout(fertig, millisekunden));
}

// Antwortet nach 0,8 bis 2,2 Sekunden, ungefähr so schnell wie der Bot auf Bedrock.
// fehlerart: "reihe" (normale Antwort) oder ein Fehler aus dem Bedienfeld.
async function frageVorgetaeuschtenBot(fehlerart) {
  if (fehlerart === "TIMEOUT") {
    await warte(4000);
    return fehlerAntwort("TIMEOUT");
  }
  await warte(800 + Math.random() * 1400);
  if (fehlerart !== "reihe") return fehlerAntwort(fehlerart);
  const antwort = VORGETAEUSCHTE_ANTWORTEN[naechsteVorgetaeuschteAntwort % VORGETAEUSCHTE_ANTWORTEN.length];
  naechsteVorgetaeuschteAntwort++;
  return antwort;
}
