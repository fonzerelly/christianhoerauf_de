import { describe, expect, it } from "vitest";
import { itemAt, lastOf } from "./lists";

describe("itemAt", () => {
  it("liefert das Element an der Stelle", () => {
    expect(itemAt(["a", "b", "c"], 1)).toBe("b");
  });

  it("wirft, wenn die Stelle nicht in der Liste liegt", () => {
    expect(() => itemAt(["a"], 1)).toThrow(RangeError);
    expect(() => itemAt(["a"], -1)).toThrow(RangeError);
  });

  it("nennt Stelle und Länge in der Fehlermeldung", () => {
    expect(() => itemAt(["a", "b"], 5)).toThrow("Stelle 5 liegt nicht in einer Liste der Länge 2");
  });

  it("liefert auch ein Element, das null ist", () => {
    expect(itemAt([null], 0)).toBeNull();
  });
});

describe("lastOf", () => {
  it("liefert das letzte Element", () => {
    expect(lastOf([1, 2, 3])).toBe(3);
  });

  it("wirft bei einer leeren Liste", () => {
    expect(() => lastOf([])).toThrow(RangeError);
  });
});
