// Mit `noUncheckedIndexedAccess` ist jedes `list[i]` auch `undefined`. Wo der Aufrufer weiß,
// dass die Stelle existiert, drücken diese Funktionen das aus, statt `?? ""` oder `!` zu
// streuen. Ein Irrtum wird so laut statt still.

/** Das Element an der Stelle `index`; wirft, wenn es die Stelle nicht gibt. */
export function itemAt<Item>(list: readonly Item[], index: number): Item {
  if (index < 0 || index >= list.length) {
    throw new RangeError(
      `Stelle ${String(index)} liegt nicht in einer Liste der Länge ${String(list.length)}`,
    );
  }
  return list[index] as Item;
}

/** Das letzte Element; wirft bei einer leeren Liste. */
export function lastOf<Item>(list: readonly Item[]): Item {
  return itemAt(list, list.length - 1);
}
