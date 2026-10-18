import { itemAt } from "../lists";
import type { RandomSource } from "./random-source";

// Alle drei Funktionen ziehen ihre Zahlen in genau der Reihenfolge des Prototyps
// (siehe Golden Master), deshalb darf an den Ziehungen nichts "vereinfacht" werden.

/** Wählt ein zufälliges Element. Die Liste darf nicht leer sein. */
export function pickOne<Item>(list: readonly Item[], random: RandomSource): Item {
  return itemAt(list, Math.floor(random.next() * list.length));
}

/** Wählt eine ganze Zahl von `min` bis `max`, beide eingeschlossen. */
export function integerBetween(min: number, max: number, random: RandomSource): number {
  return min + Math.floor(random.next() * (max - min + 1));
}

/** Mischt die Liste an Ort und Stelle (Fisher-Yates von hinten) und gibt sie zurück. */
export function shuffle<Item>(list: Item[], random: RandomSource): Item[] {
  for (let last = list.length - 1; last > 0; last--) {
    const other = Math.floor(random.next() * (last + 1));
    const lastItem = itemAt(list, last);
    list[last] = itemAt(list, other);
    list[other] = lastItem;
  }
  return list;
}
