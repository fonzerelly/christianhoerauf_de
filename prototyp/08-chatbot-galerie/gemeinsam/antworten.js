// Gemeinsame Platzhalter-Antworten für alle 50 Prototypen der Galerie.
//
// Bewusst simpel: drei Fragen mit Lorem-Ipsum-Antworten, eine Begrüßung und eine
// "weiß ich nicht"-Antwort. Es geht in der Galerie nur ums Aussehen, nicht um Inhalte.
// Eingebunden wird die Datei mit einem normalen <script>-Tag (kein Modul), damit die
// Prototypen auch per Doppelklick (file://) laufen.

const ANTWORTEN = {
  begruessung:
    "Hallo! Ich bin ChrisBot. Frag mich etwas über Christian Hörauf – zum Beispiel, wer er ist oder was er beruflich macht.",
  unbekannt:
    "Dazu weiß ich leider noch nichts. Lorem ipsum dolor sit amet – frag mich lieber, wer ich bin oder was Chris beruflich macht.",
  eintraege: [
    {
      stichwoerter: ["wer bist du", "wer ist", "name", "hallo", "hi"],
      antwort:
        "Ich bin ChrisBot, der Chatbot von Christian Hörauf. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore.",
    },
    {
      stichwoerter: ["beruflich", "beruf", "job", "arbeit", "machst du"],
      antwort:
        "Chris ist Softwareentwickler. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.",
    },
    {
      stichwoerter: ["lang", "langes", "erzähl", "erzähle", "geschichte"],
      antwort:
        "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
    },
  ],
};

// Die drei Fragen, die die Prototypen als Vorschlag anbieten.
const VORSCHLAEGE = ["Wer bist du?", "Was machst du beruflich?", "Erzähl mir was Langes"];

// Vereinfacht einen Text für den Abgleich: Kleinbuchstaben, alles außer Buchstaben und
// Ziffern wird zu Leerzeichen, vorn und hinten steht genau ein Leerzeichen.
// Aus "Wer bist du?" wird " wer bist du ". Die Leerzeichen am Rand sorgen dafür,
// dass nur ganze Wörter gefunden werden ("hi" passt dann nicht auf "Schiff").
function vereinfache(text) {
  const woerter = text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  return " " + woerter + " ";
}

// Liefert den Antworttext zu einer Frage:
//   leere Frage            -> Begrüßung
//   Frage mit Stichwort    -> Antwort des ersten passenden Eintrags
//   alles andere           -> "weiß ich nicht"-Antwort
function findeAntwort(frage) {
  if (frage.trim() === "") return ANTWORTEN.begruessung;
  const passender = ANTWORTEN.eintraege.find((eintrag) =>
    eintrag.stichwoerter.some((wort) => vereinfache(frage).includes(vereinfache(wort)))
  );
  return passender ? passender.antwort : ANTWORTEN.unbekannt;
}

// Tut so, als frage man ein echtes Backend: liefert nach einer kurzen Wartezeit ein
// Versprechen auf {text}, im selben Format wie der echte Bot (ADR system/0003).
function frageBot(frage, wartezeitMs = 500 + Math.random() * 600) {
  return new Promise((fertig) => {
    setTimeout(() => fertig({ text: findeAntwort(frage) }), wartezeitMs);
  });
}

// Für die Tests unter Node; im Browser gibt es kein `module`.
if (typeof module !== "undefined") module.exports = { findeAntwort, frageBot, ANTWORTEN, VORSCHLAEGE };
