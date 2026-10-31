// Platzhalter-Antworten für Prototyp 9: zu jeder Antwort ein Schlüsselwort, das der
// Lichtpunkt schreibt, und ein normaler Text, der sofort lesbar ist.
//
// Die Texte sind Lorem ipsum und sagen bewusst nichts über Christians Lebenslauf. Nur das
// Schlüsselwort steht als echtes Wort darin, damit man sieht, wie es im Text markiert wird.
// Später kommen Text und Schlüsselwort vom Sprachmodell (Antwort {"text", "gimmick"}).
//
// Schlüsselwörter: nur Zeichen, die die Labyrinth-Schrift kennt (A-Z, ÄÖÜ, 0-9, - . ?).
// Ein "|" markiert eine Trennstelle und wird nie angezeigt.

const SCHLUESSEL_ANTWORTEN = {
  begruessung: {
    schluesselwort: "CHRIS",
    text: "Guten Tag, ich bin ChrisBot, der Assistent von Chris Hörauf. Fragen Sie mich etwas über ihn. Lorem ipsum dolor sit amet, die Antwort steht sofort hier.",
  },
  unbekannt: {
    schluesselwort: "HM?",
    text: "Lorem ipsum, dazu weiß ich noch nichts. Versuchen Sie es mit einer anderen Frage.",
  },
  eintraege: [
    {
      stichwoerter: ["wer bist du", "wer", "name", "heißt", "heisst"],
      schluesselwort: "ENTWICKLER",
      text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor als Entwickler incididunt ut labore et dolore. Ut enim ad minim veniam, quis nostrud exercitation.",
    },
    {
      stichwoerter: ["beruflich", "beruf", "arbeit", "arbeitest", "job", "machst"],
      schluesselwort: "KAFKA",
      text: "Lorem ipsum dolor sit amet mit Kafka, consectetur adipiscing elit. Duis aute irure dolor in reprehenderit in voluptate velit. Excepteur sint occaecat cupidatat non proident.",
    },
    {
      stichwoerter: ["lang", "lange", "langes", "erzähl", "erzähle"],
      schluesselwort: "TYPE|SCRIPT",
      text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua in TypeScript. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia. Sed ut perspiciatis unde omnis iste natus error sit voluptatem.",
    },
  ],
};

const SCHLUESSEL_VORSCHLAEGE = ["Wer bist du?", "Was machst du beruflich?", "Erzähl mir was Langes"];

// Kleinbuchstaben, alles außer Buchstaben und Ziffern wird Leerzeichen, vorn und hinten genau
// ein Leerzeichen. So lässt sich auf ganze Wörter prüfen: " wer " passt nicht in " schwerer ".
function vereinfacheFrage(text) {
  return " " + text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim() + " ";
}

// Liefert {schluesselwort, text} zur Frage: leer -> Begrüßung, erstes Stichwort als ganzes
// Wort in der Frage -> dieser Eintrag, sonst die Ausweich-Antwort.
function findeSchluesselAntwort(frage) {
  if (frage.trim() === "") return SCHLUESSEL_ANTWORTEN.begruessung;
  const vereinfacht = vereinfacheFrage(frage);
  const treffer = SCHLUESSEL_ANTWORTEN.eintraege.find((eintrag) =>
    eintrag.stichwoerter.some((wort) => vereinfacht.includes(vereinfacheFrage(wort)))
  );
  return treffer || SCHLUESSEL_ANTWORTEN.unbekannt;
}

// Zerlegt den Text in Stücke, damit die Seite das Schlüsselwort hervorheben kann:
// [{text, hervorgehoben}], aneinandergereiht ergibt das wieder den ganzen Text.
// Gefunden wird das Wort nur als ganzes Wort ("Chris" ja, "Christian" nein), Trennstellen im
// Schlüsselwort und Groß- und Kleinschreibung zählen nicht.
function teileAmSchluesselwort(text, schluesselwort) {
  const gesucht = schluesselwort.split("|").join("");
  if (gesucht === "") return [{ text, hervorgehoben: false }];
  const maskiert = gesucht.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const ganzesWort = new RegExp(`(?<![\\p{L}\\p{N}])${maskiert}(?![\\p{L}\\p{N}])`, "giu");
  const teile = [];
  let ab = 0;
  for (const fund of text.matchAll(ganzesWort)) {
    if (fund.index > ab) teile.push({ text: text.slice(ab, fund.index), hervorgehoben: false });
    teile.push({ text: fund[0], hervorgehoben: true });
    ab = fund.index + fund[0].length;
  }
  if (ab < text.length) teile.push({ text: text.slice(ab), hervorgehoben: false });
  return teile;
}

// Teilt einen Text in Sätze: nach . ! oder ? mit folgendem Leerzeichen. Für die Aufzählung
// im Briefpapier, wo jeder Satz ein eigener Punkt wird.
function zerlegeInSaetze(text) {
  return text.split(/(?<=[.!?])\s+/).filter((satz) => satz.trim() !== "");
}

// Der vorgetäuschte Bot: antwortet nach einer kurzen Wartezeit, wie später das Sprachmodell.
function frageChrisBot(frage, wartezeitMs = 500 + Math.random() * 700) {
  return new Promise((fertig) => setTimeout(() => fertig(findeSchluesselAntwort(frage)), wartezeitMs));
}
