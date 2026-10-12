// Die Antworten: wählt zu einer Frage die Antwort aus der Platzhalter-Tabelle in config.js.
//
// Das ist bewusst simpel. Später steht an dieser Stelle der Aufruf des Sprachmodells;
// der Rest des Prototyps braucht von hier nur die Funktion findAnswer.

// Beginnt die Eingabe mit diesem Zeichen, wird der Rest wörtlich geschrieben (Testhilfe).
// Die Testhilfe gibt es nur, wenn die Config sie erlaubt (allowLiteralAnswers).
const LITERAL_PREFIX = "=";

// Vereinfacht einen Text für den Abgleich: Kleinbuchstaben, alles außer Buchstaben und
// Ziffern wird zu Leerzeichen, vorn und hinten steht genau ein Leerzeichen.
// Aus "Wer bist du?" wird " wer bist du ". Die Leerzeichen am Rand sorgen dafür,
// dass nur ganze Wörter gefunden werden ("hi" passt dann nicht auf "Schiff").
function simplifyForMatching(text) {
  const words = text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
  return " " + words + " ";
}

// Kommt das Stichwort als ganzes Wort (oder als ganze Wortfolge) in der Frage vor?
function containsKeyword(question, keyword) {
  return simplifyForMatching(question).includes(simplifyForMatching(keyword));
}

// Liefert den Text, den der Lichtpunkt als Antwort schreiben soll.
//   "=BELIEBIG"            -> "BELIEBIG" (wörtlich, zum Ausprobieren; nur wenn erlaubt)
//   Frage mit Stichwort    -> die Antwort des ersten passenden Eintrags der Tabelle
//   alles andere           -> die "weiß ich nicht"-Antwort
function findAnswer(question, config) {
  const isLiteral = config.allowLiteralAnswers && question.startsWith(LITERAL_PREFIX);
  if (isLiteral) return question.slice(LITERAL_PREFIX.length);

  const matchingEntry = config.answers.find((entry) =>
    entry.keywords.some((keyword) => containsKeyword(question, keyword))
  );
  return matchingEntry ? matchingEntry.answer : config.unknownAnswer;
}
