import { itemAt } from "../lists";
import type { Position } from "../maze/position";

/** Haben zwei Stellen dieselbe Zelle? */
export function isSameCell(first: Position, second: Position): boolean {
  return first.x === second.x && first.y === second.y;
}

/**
 * Die Zellen auf einer geraden Linie von `from` nach `to`, beide eingeschlossen. Im Raster geht
 * es nur waagrecht oder senkrecht weiter; eine Schräge wird deshalb eine Treppe. Bei jedem
 * Schritt wählt die Funktion die Richtung, die näher an der geraden Linie bleibt; bei Gleichstand
 * waagrecht.
 */
export function cellsOnLine(from: Position, to: Position): Position[] {
  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;
  const stepX = Math.sign(deltaX);
  const stepY = Math.sign(deltaY);
  // Wie weit eine Zelle neben der Linie liegt (bis auf einen festen Faktor, das Kreuzprodukt).
  const distanceFromLine = (x: number, y: number): number =>
    Math.abs((x - from.x) * deltaY - (y - from.y) * deltaX);

  const cells: Position[] = [from];
  let { x, y } = from;
  while (x !== to.x || y !== to.y) {
    if (x === to.x) y += stepY;
    else if (y === to.y) x += stepX;
    else if (distanceFromLine(x + stepX, y) <= distanceFromLine(x, y + stepY)) x += stepX;
    else y += stepY;
    cells.push({ x, y });
  }
  return cells;
}

/**
 * Die Zellen entlang einer Kurve, gegeben als dicht liegende Punkte mit Nachkommastellen. Jeder
 * Punkt fällt in die Zelle, in der er liegt; springt die Kurve dabei über eine Zelle hinweg,
 * füllt `cellsOnLine` die Lücke. Eine Zacke aus einer einzigen Zelle (die Kurve streift eine
 * Nachbarzelle nur und kehrt gleich zurück) fällt weg, weil sie im Bild nur als Ausreißer wirkt.
 */
export function cellsOnCurve(points: readonly Position[]): Position[] {
  const cells: Position[] = [];
  for (const point of points) {
    const cell = { x: Math.floor(point.x), y: Math.floor(point.y) };
    const last = cells.at(-1);
    if (last === undefined) cells.push(cell);
    else if (!isSameCell(last, cell)) cells.push(...cellsOnLine(last, cell).slice(1));
  }
  return withoutSingleCellSpikes(cells);
}

/**
 * Schließt einen Umriss, von dem nur die linke Hälfte gerastert ist: Sie läuft von unten in der
 * mittleren Spalte bis oben in der mittleren Spalte. Die rechte Hälfte ist ihr Spiegelbild in
 * einem Feld von `width` Spalten und läuft wieder hinunter. So wird der Umriss auch im groben
 * Raster genau symmetrisch. Steigt die linke Hälfte zuletzt eine Zelle in die mittlere Spalte
 * hinab, entstünde an der Naht eine Zacke; sie fällt weg.
 */
export function closeByMirroring(leftHalf: readonly Position[], width: number): Position[] {
  const rightHalf = leftHalf
    .map(({ x, y }) => ({ x: width - 1 - x, y }))
    .reverse()
    .slice(1); // die oberste Zelle steht schon am Ende der linken Hälfte
  return withoutSingleCellSpikes([...leftHalf, ...rightHalf]);
}

/**
 * Entfernt Zacken aus einer Zelle: Bei A, B, A fallen B und das zweite A weg. Läuft der Weg
 * länger auf sich zurück (A, B, C, B, A), ist das keine Zacke, sondern ein gewollter Strich hin
 * und zurück, und alles bleibt.
 */
function withoutSingleCellSpikes(cells: readonly Position[]): Position[] {
  const result: Position[] = [];
  for (let index = 0; index < cells.length; index++) {
    const before = cells[index - 1];
    const after = cells[index + 1];
    const twoBefore = cells[index - 2];
    const twoAfter = cells[index + 2];
    const turnsBackAtOnce =
      before !== undefined && after !== undefined && isSameCell(before, after);
    const turnsBackLonger =
      twoBefore !== undefined && twoAfter !== undefined && isSameCell(twoBefore, twoAfter);
    if (turnsBackAtOnce && !turnsBackLonger) {
      index++; // die Zacke und die Rückkehr überspringen
      continue;
    }
    result.push(itemAt(cells, index));
  }
  return result;
}
