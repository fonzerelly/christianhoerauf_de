import type { WaypointMarker } from "./glyph";

/** Ein Wegpunkt in Kurzschreibweise: `[x, y]` oder `[x, y, Markierung]`. */
export type WaypointTuple = readonly [number, number] | readonly [number, number, WaypointMarker];

// Die Schrift: jedes Zeichen ist der Weg, den der Lichtpunkt läuft, um es zu schreiben.
//
// Ein Zeichen lebt in einem Feld aus 3 x 5 Zellen. x läuft von 0 (links) bis 2 (rechts),
// y von 0 (oben) bis 4 (unten). Zwischen zwei Wegpunkten läuft der Punkt geradeaus, nur
// waagrecht oder senkrecht, nie schräg.
//
// Regeln für jeden Weg:
//  - Erster und letzter Wegpunkt liegen in der untersten Zeile (y = 4), denn dort steigt der
//    Punkt aus der Grundlinie ein und wieder aus.
//  - Ein Stück doppelt zu laufen ist erlaubt (beim H: den linken Balken hoch und halb zurück).
//  - Schrägen gibt es im Raster nicht. K, N, R und X behelfen sich mit Treppenstufen, B und D
//    haben ihren senkrechten Balken in der Mitte, damit sie nicht wie 8 und O aussehen.
//  - Ä, Ö, Ü sind eine Zeile niedriger (y = 1 bis 4); in der obersten Zeile ist Platz für die
//    beiden Punkte ("dot").
//  - "hop" lässt den Punkt ohne Leuchtspur zum Wegpunkt springen (Bindestrich, Fragezeichen).
//  - "!" ist wie "?" ein Strich mit einem Punkt darunter; der Strich wird wie beim Fragezeichen
//    ohne Leuchtspur angefahren.
//  - Die Ersatzglyphe läuft in Schlangenlinien durch alle 15 Zellen, jede genau einmal. Sie
//    steht für jedes Zeichen, das die Schrift nicht kennt.
// prettier-ignore
export const GLYPH_PATHS: Readonly<Record<string, readonly WaypointTuple[]>> = {
  "0": [[0, 4], [0, 0], [2, 0], [2, 4], [0, 4]],
  "1": [[2, 4], [2, 0], [1, 0], [2, 0], [2, 4]],
  "2": [[0, 4], [2, 4], [0, 4], [0, 2], [2, 2], [2, 0], [0, 0], [2, 0], [2, 2], [0, 2], [0, 4]],
  "3": [[0, 4], [2, 4], [2, 2], [1, 2], [2, 2], [2, 0], [0, 0], [2, 0], [2, 4]],
  "4": [[2, 4], [2, 0], [2, 2], [0, 2], [0, 0], [0, 2], [2, 2], [2, 4]],
  "5": [[0, 4], [2, 4], [2, 2], [0, 2], [0, 0], [2, 0], [0, 0], [0, 2], [2, 2], [2, 4]],
  "6": [[0, 4], [0, 0], [2, 0], [0, 0], [0, 2], [2, 2], [2, 4], [0, 4]],
  "7": [[2, 4], [2, 0], [0, 0], [2, 0], [2, 4]],
  "8": [[0, 4], [0, 0], [2, 0], [2, 2], [0, 2], [2, 2], [2, 4], [0, 4]],
  "9": [[0, 4], [2, 4], [2, 0], [0, 0], [0, 2], [2, 2], [2, 4]],
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
  Ä: [[0, 4], [0, 1], [0, 0, "dot"], [0, 1], [2, 1], [2, 0, "dot"], [2, 1], [2, 3], [0, 3], [2, 3], [2, 4]],
  Ö: [[0, 4], [0, 1], [0, 0, "dot"], [0, 1], [2, 1], [2, 0, "dot"], [2, 1], [2, 4], [0, 4]],
  Ü: [[0, 4], [0, 1], [0, 0, "dot"], [0, 1], [0, 4], [2, 4], [2, 1], [2, 0, "dot"], [2, 1], [2, 4]],
  "-": [[0, 4], [0, 2, "hop"], [2, 2], [2, 4, "hop"]],
  ".": [[0, 4, "dot"]],
  "?": [[1, 4, "dot"], [1, 3], [1, 2], [2, 2], [2, 0], [0, 0], [0, 1], [0, 4, "hop"]],
  "!": [[1, 4], [1, 2, "hop"], [1, 0], [1, 4, "dot"]],
  "█": [[0, 4], [0, 0], [2, 0], [2, 1], [1, 1], [1, 2], [2, 2], [2, 3], [1, 3], [1, 4], [2, 4]],
};
