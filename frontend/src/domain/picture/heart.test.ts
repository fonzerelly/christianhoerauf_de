import { describe, expect, it } from "vitest";
import { lastOf } from "../lists";
import { heartHeightOf, heartPath } from "./heart";

const key = ({ x, y }: { x: number; y: number }): string => `${String(x)},${String(y)}`;

describe("heartPath", () => {
  it("ist etwas niedriger als breit", () => {
    expect(heartHeightOf(21)).toBe(19);
    expect(heartHeightOf(11)).toBe(10);
  });

  it("beginnt und endet an der Spitze: unterste Zeile, mittlere Spalte", () => {
    const path = heartPath(21);

    expect(key(path[0] ?? { x: -1, y: -1 })).toBe("10,18");
    expect(key(lastOf(path))).toBe("10,18");
  });

  it("geht nur zur Nachbarzelle weiter und bleibt in Breite und Höhe", () => {
    for (const width of [11, 15, 21, 31]) {
      const path = heartPath(width);

      path.slice(1).forEach((cell, index) => {
        const before = path[index] ?? cell;
        expect(Math.abs(cell.x - before.x) + Math.abs(cell.y - before.y)).toBe(1);
      });
      expect(Math.min(...path.map((cell) => cell.x))).toBe(0);
      expect(Math.max(...path.map((cell) => cell.x))).toBe(width - 1);
      expect(Math.min(...path.map((cell) => cell.y))).toBe(0);
      expect(Math.max(...path.map((cell) => cell.y))).toBe(heartHeightOf(width) - 1);
    }
  });

  it("ist spiegelgleich zur mittleren Spalte", () => {
    const path = heartPath(21);
    const cells = new Set(path.map(key));
    const mirrored = new Set(path.map(({ x, y }) => key({ x: 20 - x, y })));

    expect(mirrored).toEqual(cells);
  });

  it("läuft zuerst links hinauf und hat oben in der Mitte eine Kerbe", () => {
    const path = heartPath(21);
    const center = path.filter((cell) => cell.x === 10).map((cell) => cell.y);

    expect(path.slice(1, 6).map((cell) => cell.x <= 10)).toEqual([true, true, true, true, true]);
    // Die Kerbe liegt tiefer als die obersten Zellen der beiden Bögen.
    expect(center.length).toBeGreaterThan(1);
    expect(Math.min(...center)).toBeGreaterThan(0);
  });

  it("läuft keine Zelle zweimal, außer an der Spitze, wo der Weg beginnt und endet", () => {
    for (const width of [11, 15, 21, 31]) {
      // Anfang: Spitze, Zelle darüber; Ende: dieselbe Zelle darüber, Spitze.
      const cells = heartPath(width).slice(1, -2).map(key);

      expect(new Set(cells).size).toBe(cells.length);
    }
  });
});
