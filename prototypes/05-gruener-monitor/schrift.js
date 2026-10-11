// Die Schrift: jeder Buchstabe ist der Weg, den der Lichtpunkt läuft, um ihn zu "schreiben".
//
// Ein Buchstabe lebt in einem Kästchen aus 3 x 5 Zellen. x läuft von 0 (links) bis 2 (rechts),
// y von 0 (oben) bis 4 (unten). Der Weg ist eine Liste von Wegpunkten [x, y]; zwischen zwei
// Wegpunkten läuft der Punkt geradeaus (nur waagrecht oder senkrecht, nie schräg).
//
// Regeln für jeden Weg:
//  - Erster und letzter Wegpunkt liegen in der untersten Zeile (y = 4), denn dort
//    steigt der Punkt aus der Verbindungsspur ein und wieder aus.
//  - Ein Stück doppelt zu laufen ist erlaubt (z. B. beim H den linken Balken hoch und halb zurück).
//  - Schrägen gibt es im Raster nicht. K, N, R, X behelfen sich mit Treppenstufen,
//    B und D haben ihren senkrechten Balken in der Mitte, damit sie nicht wie 8 und O aussehen.
//
// Umlaute: Ä, Ö, Ü sind eine Zeile niedriger (y = 1 bis 4), damit in der obersten Zeile
// Platz für die beiden Punkte bleibt. Ein Wegpunkt mit der Markierung DOT bedeutet:
// der Lichtpunkt hüpft ohne Leuchtspur dorthin, hinterlässt einen Punkt und hüpft
// ohne Leuchtspur wieder weg.

const DOT = "dot";
// Ein Wegpunkt mit der Markierung HOP bedeutet: der Lichtpunkt hüpft ohne Leuchtspur dorthin.
// So entstehen Zeichen, die nicht bis zur untersten Zeile reichen (der Trennstrich).
const HOP = "hop";

const GLYPH_HEIGHT = 5;
const CHAR_ADVANCE = 4; // 3 Zellen Buchstabe + 1 Zelle Abstand
const LINE_ADVANCE = 7; // 5 Zeilen Buchstabe + 1 Verbindungsspur + 1 Rückweg zur nächsten Zeile

const GLYPHS = {
  A: [[0, 4], [0, 0], [2, 0], [2, 2], [0, 2], [2, 2], [2, 4]],
  B: [[0, 4], [2, 4], [2, 2], [1, 2], [2, 2], [2, 0], [0, 0], [1, 0], [1, 4]],
  C: [[0, 4], [0, 0], [2, 0], [0, 0], [0, 4], [2, 4]],
  D: [[0, 4], [2, 4], [2, 0], [0, 0], [1, 0], [1, 4]],
  E: [[0, 4], [0, 0], [2, 0], [0, 0], [0, 2], [1, 2], [0, 2], [0, 4], [2, 4]],
  F: [[0, 4], [0, 0], [2, 0], [0, 0], [0, 2], [1, 2], [0, 2], [0, 4]],
  G: [[0, 4], [0, 0], [2, 0], [0, 0], [0, 4], [2, 4], [2, 2], [1, 2], [2, 2], [2, 4]],
  H: [[0, 4], [0, 0], [0, 2], [2, 2], [2, 0], [2, 4]],
  I: [[0, 4], [2, 4], [1, 4], [1, 0], [0, 0], [2, 0], [1, 0], [1, 4]],
  J: [[0, 4], [0, 3], [0, 4], [2, 4], [2, 0], [2, 4]],
  K: [[0, 4], [0, 0], [0, 2], [1, 2], [1, 1], [2, 1], [2, 0], [2, 1], [1, 1], [1, 2], [1, 3], [2, 3], [2, 4]],
  L: [[0, 4], [0, 0], [0, 4], [2, 4]],
  M: [[0, 4], [0, 0], [1, 0], [1, 2], [1, 0], [2, 0], [2, 4]],
  N: [[0, 4], [0, 0], [0, 1], [1, 1], [1, 3], [2, 3], [2, 0], [2, 4]],
  O: [[0, 4], [0, 0], [2, 0], [2, 4], [0, 4]],
  P: [[0, 4], [0, 0], [2, 0], [2, 2], [0, 2], [0, 4]],
  Q: [[0, 4], [0, 0], [2, 0], [2, 4], [1, 4], [1, 3], [1, 4], [0, 4]],
  R: [[0, 4], [0, 0], [2, 0], [2, 2], [0, 2], [1, 2], [1, 3], [2, 3], [2, 4]],
  S: [[0, 4], [2, 4], [2, 2], [0, 2], [0, 0], [2, 0], [0, 0], [0, 2], [2, 2], [2, 4]],
  T: [[1, 4], [1, 0], [0, 0], [2, 0], [1, 0], [1, 4]],
  U: [[0, 4], [0, 0], [0, 4], [2, 4], [2, 0], [2, 4]],
  V: [[1, 4], [1, 3], [0, 3], [0, 0], [0, 3], [2, 3], [2, 0], [2, 3], [1, 3], [1, 4]],
  W: [[0, 4], [0, 0], [0, 4], [1, 4], [1, 2], [1, 4], [2, 4], [2, 0], [2, 4]],
  X: [[0, 4], [0, 3], [1, 3], [1, 1], [0, 1], [0, 0], [0, 1], [2, 1], [2, 0], [2, 1], [1, 1], [1, 3], [2, 3], [2, 4]],
  Y: [[1, 4], [1, 2], [0, 2], [0, 0], [0, 2], [2, 2], [2, 0], [2, 2], [1, 2], [1, 4]],
  Z: [[0, 4], [2, 4], [0, 4], [0, 2], [2, 2], [2, 0], [0, 0], [2, 0], [2, 2], [0, 2], [0, 4]],
  Ä: [[0, 4], [0, 1], [0, 0, DOT], [0, 1], [2, 1], [2, 0, DOT], [2, 1], [2, 3], [0, 3], [2, 3], [2, 4]],
  Ö: [[0, 4], [0, 1], [0, 0, DOT], [0, 1], [2, 1], [2, 0, DOT], [2, 1], [2, 4], [0, 4]],
  Ü: [[0, 4], [0, 1], [0, 0, DOT], [0, 1], [0, 4], [2, 4], [2, 1], [2, 0, DOT], [2, 1], [2, 4]],
  "-": [[0, 4], [0, 2, HOP], [2, 2], [2, 4, HOP]],
  0: [[0, 4], [0, 0], [2, 0], [2, 4], [0, 4]],
  1: [[2, 4], [2, 0], [1, 0], [2, 0], [2, 4]],
  2: [[0, 4], [2, 4], [0, 4], [0, 2], [2, 2], [2, 0], [0, 0], [2, 0], [2, 2], [0, 2], [0, 4]],
  3: [[0, 4], [2, 4], [2, 2], [1, 2], [2, 2], [2, 0], [0, 0], [2, 0], [2, 4]],
  4: [[2, 4], [2, 0], [2, 2], [0, 2], [0, 0], [0, 2], [2, 2], [2, 4]],
  5: [[0, 4], [2, 4], [2, 2], [0, 2], [0, 0], [2, 0], [0, 0], [0, 2], [2, 2], [2, 4]],
  6: [[0, 4], [0, 0], [2, 0], [0, 0], [0, 2], [2, 2], [2, 4], [0, 4]],
  7: [[2, 4], [2, 0], [0, 0], [2, 0], [2, 4]],
  8: [[0, 4], [0, 0], [2, 0], [2, 2], [0, 2], [2, 2], [2, 4], [0, 4]],
  9: [[0, 4], [2, 4], [2, 0], [0, 0], [0, 2], [2, 2], [2, 4]],
};

// Macht aus beliebiger Eingabe einen Text, den die Schrift darstellen kann:
// Großbuchstaben (Umlaute und Bindestriche bleiben erhalten), alles Unbekannte entfernt.
function normalizeText(text) {
  return text
    .toUpperCase() // macht aus "ß" bereits "SS"
    .split("")
    .filter((char) => char === " " || GLYPHS[char])
    .join("")
    .replace(/ +/g, " ")
    .trim();
}

// Zerteilt ein Wort, das länger ist als eine Zeile, in Stücke mit Trennstrich.
// Jedes Stück füllt die Zeile aus; der Rest hat immer mindestens zwei Buchstaben,
// weil nur Wörter zerteilt werden, die mindestens ein Zeichen zu lang sind.
function hyphenate(word, maxCharsPerLine) {
  const lettersBesideHyphen = maxCharsPerLine - 1;
  const hasRoomForHyphen = lettersBesideHyphen >= 2;

  const pieces = [];
  let rest = word;
  while (rest.length > maxCharsPerLine) {
    const lettersTaken = hasRoomForHyphen ? lettersBesideHyphen : maxCharsPerLine;
    pieces.push(rest.slice(0, lettersTaken) + (hasRoomForHyphen ? "-" : ""));
    rest = rest.slice(lettersTaken);
  }
  pieces.push(rest);
  return pieces;
}

// Verhindert Zeilen, die nur aus einem einzelnen Zeichen bestehen (z. B. die "8" von
// "8 JAHRE"): das letzte Wort der Zeile davor rutscht mit hinunter, wenn es dort Platz hat.
function avoidLonelyCharacters(lines, maxCharsPerLine) {
  for (let index = 1; index < lines.length; index++) {
    const wordsBefore = lines[index - 1].split(" ");
    const isLonely = lines[index].length === 1;
    const candidate = wordsBefore[wordsBefore.length - 1] + " " + lines[index];
    const canBorrowWord =
      wordsBefore.length >= 2 && !lines[index - 1].endsWith("-") && candidate.length <= maxCharsPerLine;

    if (isLonely && canBorrowWord) {
      lines[index - 1] = wordsBefore.slice(0, -1).join(" ");
      lines[index] = candidate;
    }
  }
  return lines;
}

// Bricht den Text an Wortgrenzen in Zeilen um. Ein Wort, das länger ist als
// eine Zeile, wird mit Trennstrich zerteilt.
function wrapText(text, maxCharsPerLine) {
  const lines = [];
  let currentLine = "";

  const words = text.split(" ").filter((word) => word.length > 0);
  for (let word of words) {
    if (word.length > maxCharsPerLine) {
      const pieces = hyphenate(word, maxCharsPerLine);
      if (currentLine) lines.push(currentLine);
      lines.push(...pieces.slice(0, -1));
      word = pieces[pieces.length - 1];
      currentLine = "";
    }
    const candidate = currentLine ? currentLine + " " + word : word;
    if (candidate.length <= maxCharsPerLine) {
      currentLine = candidate;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);

  return avoidLonelyCharacters(lines, maxCharsPerLine);
}
