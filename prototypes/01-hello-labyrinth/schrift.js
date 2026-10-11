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
// Großbuchstaben, Umlaute ausgeschrieben, alles Unbekannte entfernt.
function normalizeText(text) {
  const umlauts = { Ä: "AE", Ö: "OE", Ü: "UE" };
  return text
    .toUpperCase() // macht aus "ß" bereits "SS"
    .replace(/[ÄÖÜ]/g, (umlaut) => umlauts[umlaut])
    .split("")
    .filter((char) => char === " " || GLYPHS[char])
    .join("")
    .replace(/ +/g, " ")
    .trim();
}

// Bricht den Text an Wortgrenzen in Zeilen um. Ein Wort, das länger ist als
// eine Zeile, wird hart zerteilt.
function wrapText(text, maxCharsPerLine) {
  const lines = [];
  let currentLine = "";

  const words = text.split(" ").filter((word) => word.length > 0);
  for (let word of words) {
    while (word.length > maxCharsPerLine) {
      if (currentLine) lines.push(currentLine);
      lines.push(word.slice(0, maxCharsPerLine));
      word = word.slice(maxCharsPerLine);
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

  return lines;
}
